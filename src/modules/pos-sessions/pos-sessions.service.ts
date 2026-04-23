import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { User } from '../rbac/users/entities/user.entity';
import { ReasonCategoriesService } from '../reason-categories/reason-categories.service';
import {
  ClosePosSessionDto,
  OpenPosSessionDto,
} from './dto/create-pos-session.dto';
import { PosSession, PosSessionStatus } from './entities/pos-session.entity';

@Injectable()
export class PosSessionsService {
  constructor(
    @InjectRepository(PosSession)
    private readonly posSessionRepository: Repository<PosSession>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly reasonCategoriesService: ReasonCategoriesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private mapSessionResponse(session: PosSession) {
    if (!session) return null;

    const { user, branch, orders, ...rest } = session;

    return {
      ...rest,
      branch: branch ? { id: branch.id } : null,
      user: user ? { id: user.id } : null,
    };
  }

  async openSession(openPosSessionDto: OpenPosSessionDto, user: User) {
    const { branch_id, openingBalance, notes } = openPosSessionDto;

    const branch = await this.branchRepository.findOne({
      where: { id: branch_id },
    });
    if (!branch) {
      throw new HttpException('Branch not found', HttpStatus.NOT_FOUND);
    }

    const activeSession = await this.posSessionRepository.findOne({
      where: {
        user: { id: user.id },
        status: PosSessionStatus.OPEN,
      },
    });

    if (activeSession) {
      return {
        message: 'Reconnected to existing active session',
        data: this.mapSessionResponse(activeSession),
      };
    }

    const newSession = this.posSessionRepository.create({
      branch,
      user,
      startTime: new Date(),
      openingBalance,
      notes,
      status: PosSessionStatus.OPEN,
    });

    const savedSession = await this.posSessionRepository.save(newSession);

    // Link existing PENDING orders for this user and branch to the new session
    // Using raw SQL to avoid TypeORM QueryBuilder "pos_session_id" not found error

    // Using query() directly on the repository
    await this.orderRepository.query(
      `UPDATE orders SET pos_session_id = $1 WHERE user_id = $2 AND branch_id = $3 AND status = $4 AND pos_session_id IS NULL`,
      [savedSession.id, user.id, branch_id, OrderStatus.PENDING],
    );

    // Emit event for notification
    this.eventEmitter.emit('pos.session.opened', {
      sessionId: savedSession.id,
      cashierName: user.name,
      branchName: branch.name,
    });

    return {
      message: 'POS session opened successfully',
      data: this.mapSessionResponse(savedSession),
    };
  }

  async closeSession(
    id: string,
    closePosSessionDto: ClosePosSessionDto,
    user: User,
  ) {
    const session = await this.posSessionRepository.findOne({
      where: { id },
      relations: ['user', 'branch', 'orders'],
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    if (session.user.id !== user.id && user.role?.code === 'cashier') {
      throw new HttpException(
        'You do not have permission to close this session',
        HttpStatus.FORBIDDEN,
      );
    }

    if (session.status === PosSessionStatus.CLOSED) {
      throw new HttpException(
        'Session is already closed',
        HttpStatus.BAD_REQUEST,
      );
    }

    // --- Collect all orders for this session (linked + orphaned fallback) ---
    const linkedOrderIds = (session.orders || []).map((o) => o.id);

    // Fallback: also find orders by same user + branch in the session time window
    // that might have a NULL pos_session_id due to the linking bug
    const sessionStart = session.startTime;
    const sessionEnd = new Date(); // session is still open at this point
    const branchId = session.branch?.id;
    const userId = session.user?.id;

    let allOrderIds: string[] = [...linkedOrderIds];
    if (branchId && userId) {
      const linkedSet = new Set(linkedOrderIds);
      const orphaned = await this.orderRepository
        .createQueryBuilder('ord')
        .where('ord.user_id = :userId', { userId })
        .andWhere('ord.branch_id = :branchId', { branchId })
        .andWhere('ord.pos_session_id IS NULL')
        .andWhere('ord.createdAt >= :start', { start: sessionStart })
        .andWhere('ord.createdAt <= :end', { end: sessionEnd })
        .select(['ord.id'])
        .getMany();

      const orphanedIds = orphaned
        .map((o) => o.id)
        .filter((oid) => !linkedSet.has(oid));
      allOrderIds = [...allOrderIds, ...orphanedIds];

      // Auto-fix: link these orphaned orders to the session before closing
      if (orphanedIds.length > 0) {
        await this.orderRepository.query(
          `UPDATE orders SET pos_session_id = $1 WHERE id = ANY($2::text[])`,
          [id, orphanedIds],
        );
      }
    }

    // --- Calculate breakdown from verified payments ---
    const sessionOrderIds = allOrderIds;
    let totalCashSales = 0;
    let totalOtherSales = 0;

    if (sessionOrderIds.length > 0) {
      const payments = await this.paymentRepository.find({
        where: sessionOrderIds.map((oid) => ({
          orderId: oid,
          status: PaymentStatus.SUCCESS,
        })),
      });
      for (const p of payments) {
        if (p.method === 'cash') {
          totalCashSales += Number(p.amount);
        } else {
          totalOtherSales += Number(p.amount);
        }
      }
    }

    const totalSales = totalCashSales + totalOtherSales;
    const openingBal = Number(session.openingBalance || 0);

    // Expected physical cash in drawer: opening balance + cash sales
    const expectedCash = openingBal + totalCashSales;
    // Total expected from all methods (for overall audit)
    const totalExpectedAll = expectedCash + totalOtherSales;

    // --- Compute closing balance from cashier's payment declarations ---
    const declarations = closePosSessionDto.paymentDeclarations || [];
    const salesCollected = declarations.reduce(
      (sum, d) => sum + Number(d.declaredAmount || 0),
      0,
    );
    const actualClosingBalAll = openingBal + salesCollected;
    const diff = actualClosingBalAll - totalExpectedAll;

    // --- Validation: Reason Category ---
    if (closePosSessionDto.reasonCategoryId) {
      const category = await this.reasonCategoriesService.findOne(
        closePosSessionDto.reasonCategoryId,
      );

      // 1. Consistency Check: Matched vs Difference
      if (category.value === 'MATCHED' && Math.abs(diff) > 0) {
        throw new HttpException(
          `Cannot select 'Matched' reason when there is a cash difference of ${diff}. Please select a more accurate reason.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Length Validation
      const notes = closePosSessionDto.notes || '';
      if (notes.length < category.min_description_length) {
        throw new HttpException(
          `Reason details are too short. The '${category.label}' category requires at least ${category.min_description_length} characters of explanation.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (Math.abs(diff) > 0) {
      throw new HttpException(
        'A reason category is required when there is a cash discrepancy.',
        HttpStatus.BAD_REQUEST,
      );
    }

    session.endTime = new Date();
    session.closingBalance = actualClosingBalAll;
    session.expected_cash = expectedCash;
    session.difference = diff;
    session.notes = closePosSessionDto.notes;
    session.reasonCategoryId = closePosSessionDto.reasonCategoryId;
    session.paymentDeclarations = declarations;
    session.status = PosSessionStatus.CLOSED;

    const saved = await this.posSessionRepository.save(session);

    // Emit event for notification
    this.eventEmitter.emit('pos.session.closed', {
      sessionId: saved.id,
      cashierName: session.user.name,
      branchName: session.branch.name,
      difference: diff,
      hasAnomaly: Math.abs(diff) > 0,
    });

    return {
      message: 'POS session closed successfully',
      data: {
        id: saved.id,
        status: saved.status,
        startTime: saved.startTime,
        endTime: saved.endTime,
        openingBalance: openingBal,
        totalSales: Number(totalSales.toFixed(2)),
        expected_cash: Number(expectedCash.toFixed(2)),
        closingBalance: actualClosingBalAll,
        difference: Number(diff.toFixed(2)),
        paymentDeclarations: declarations,
        notes: saved.notes,
        branch: session.branch ? { id: session.branch.id } : null,
        user: session.user ? { id: session.user.id } : null,
      },
    };
  }

  async getActiveSession(user: User | { id: string }) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = user.id;

    // Use a more direct query to find open session for the user
    const session = await this.posSessionRepository.findOne({
      where: {
        user: { id: userId },
        status: PosSessionStatus.OPEN,
      },
      relations: ['branch', 'user'],
    });

    if (!session) {
      return {
        message: 'No active session found',
        data: null,
      };
    }

    return {
      message: 'Active session retrieved successfully',
      data: this.mapSessionResponse(session),
    };
  }

  async getSessionSummary(id: string) {
    const session = await this.posSessionRepository.findOne({
      where: { id },
      relations: ['branch', 'user'],
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    const branchId = session.branch?.id;
    const userId = session.user?.id;
    const sessionStart = session.startTime;
    const sessionEnd = session.endTime ?? new Date();

    console.log(
      `[getSessionSummary] session=${id}, user=${userId}, branch=${branchId}, start=${sessionStart}, end=${sessionEnd}`,
    );

    // Strategy 1: Orders explicitly linked by pos_session_id
    const linkedOrders: any[] = await this.orderRepository.query(
      `SELECT id, status, subtotal, tax_amount, discount_amount
       FROM orders
       WHERE pos_session_id = $1
         AND "deletedAt" IS NULL`,
      [id],
    );

    console.log(
      `[getSessionSummary] linkedOrders count=${linkedOrders.length}`,
    );

    // Strategy 2: Orphaned orders by user+branch in session time window
    let orphanedOrders: any[] = [];
    if (branchId && userId) {
      orphanedOrders = await this.orderRepository.query(
        `SELECT id, status, subtotal, tax_amount, discount_amount
         FROM orders
         WHERE user_id = $1
           AND branch_id = $2
           AND pos_session_id IS NULL
           AND "createdAt" >= $3
           AND "createdAt" <= $4
           AND "deletedAt" IS NULL`,
        [userId, branchId, sessionStart, sessionEnd],
      );

      console.log(
        `[getSessionSummary] orphanedOrders count=${orphanedOrders.length}`,
      );

      // Auto-fix: link orphaned orders to this session
      if (orphanedOrders.length > 0) {
        const orphanedIds = orphanedOrders.map((o: any) => o.id);
        await this.orderRepository.query(
          `UPDATE orders SET pos_session_id = $1 WHERE id = ANY($2::text[])`,
          [id, orphanedIds],
        );
        console.log(
          `[getSessionSummary] Auto-linked ${orphanedIds.length} orphaned orders to session ${id}`,
        );
      }
    }

    // Combine all orders
    const allOrders = [...linkedOrders, ...orphanedOrders];
    const allOrderIds = allOrders.map((o: any) => o.id);

    console.log(
      `[getSessionSummary] totalOrders=${allOrders.length}, statuses=${allOrders.map((o: any) => o.status).join(',')}`,
    );

    // Calculate totals from COMPLETED orders
    const completedOrders = allOrders.filter(
      (o: any) => o.status === OrderStatus.COMPLETED,
    );
    const totalSales = completedOrders.reduce(
      (acc: number, o: any) =>
        acc +
        Number(o.subtotal || 0) +
        Number(o.tax_amount || 0) -
        Number(o.discount_amount || 0),
      0,
    );
    const completedCount = completedOrders.length;

    console.log(
      `[getSessionSummary] completedCount=${completedCount}, totalSales=${totalSales}`,
    );

    // Payment breakdown from SUCCESS payments
    let paymentBreakdown: { method: string; total: number }[] = [];
    if (allOrderIds.length > 0) {
      const payments: any[] = await this.paymentRepository.query(
        `SELECT method, SUM(amount::numeric) as total
         FROM payments
         WHERE "orderId" = ANY($1::text[])
           AND status = $2
         GROUP BY method`,
        [allOrderIds, PaymentStatus.SUCCESS],
      );

      console.log(
        `[getSessionSummary] payments breakdown=${JSON.stringify(payments)}`,
      );

      paymentBreakdown = payments.map((p: any) => ({
        method: p.method,
        total: Number(Number(p.total).toFixed(2)),
      }));
    }

    const openingBal = Number(session.openingBalance || 0);
    const expectedCash = openingBal + totalSales;

    const closingBal =
      session.closingBalance !== null && session.closingBalance !== undefined
        ? Number(session.closingBalance)
        : null;
    const difference =
      session.difference !== null && session.difference !== undefined
        ? Number(session.difference)
        : closingBal !== null
          ? closingBal - expectedCash
          : null;

    return {
      message: 'Session summary retrieved successfully',
      data: {
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime ?? null,
        branch: session.branch ? { id: session.branch.id } : null,
        user: session.user ? { id: session.user.id } : null,
        openingBalance: openingBal,
        totalSales: Number(totalSales.toFixed(2)),
        expected_cash: Number(expectedCash.toFixed(2)),
        closingBalance: closingBal,
        difference: difference !== null ? Number(difference.toFixed(2)) : null,
        transactionsCount: completedCount,
        totalPaymentsProcessed: completedCount,
        paymentBreakdown,
        paymentDeclarations: session.paymentDeclarations ?? [],
        notes: session.notes ?? null,
      },
    };
  }

  async findAll() {
    const sessions = await this.posSessionRepository.find({
      relations: ['branch', 'user'],
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      message: 'Success get all pos sessions',
      datas: sessions.map((s) => this.mapSessionResponse(s)),
    };
  }
}
