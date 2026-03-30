import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../rbac/users/entities/user.entity';
import {
  ClosePosSessionDto,
  OpenPosSessionDto,
} from './dto/create-pos-session.dto';
import { PosSession, PosSessionStatus } from './entities/pos-session.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { ReasonCategoriesService } from '../reason-categories/reason-categories.service';

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
      throw new HttpException(
        'User already has an active session',
        HttpStatus.BAD_REQUEST,
      );
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

    // --- Calculate breakdown from verified payments in this session ---
    const sessionOrderIds = (session.orders || []).map((o) => o.id);
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
      const category = await this.reasonCategoriesService.findOne(closePosSessionDto.reasonCategoryId);
      
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

  async getActiveSession(user: User) {
    const session = await this.posSessionRepository.findOne({
      where: {
        user: { id: user.id },
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
      relations: ['orders', 'branch', 'user'],
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    // Debug: Also query orders directly by pos_session_id to cross-check
    const directOrders = await this.orderRepository.find({
      where: { posSession: { id } },
      select: ['id', 'invoice_number', 'status', 'subtotal', 'tax_amount', 'discount_amount'],
    });

    // --- Calculate total sales from COMPLETED orders in this session ---
    // Use directOrders (queried by FK) since session.orders relation may not load in all cases
    const completedOrders = directOrders.filter(
      (o) => o.status === OrderStatus.COMPLETED,
    );
    const totalSales = completedOrders.reduce(
      (acc, o) =>
        acc +
        Number(o.subtotal || 0) +
        Number(o.tax_amount || 0) -
        Number(o.discount_amount || 0),
      0,
    );
    const totalTransactions = completedOrders.length;

    const completedCount = completedOrders.length;

    const openingBal = Number(session.openingBalance || 0);
    const expectedCash = openingBal + totalSales;
    // Use stored values if session is already closed, otherwise compute live
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

    // --- Payment breakdown: group VERIFIED payments by method ---
    const sessionOrderIds = directOrders.map((o) => o.id);
    let paymentBreakdown: { method: string; total: number }[] = [];
    if (sessionOrderIds.length > 0) {
      const payments = await this.paymentRepository.find({
        where: sessionOrderIds.map((oid) => ({
          orderId: oid,
          status: PaymentStatus.SUCCESS,
        })),
      });
      const grouped: Record<string, number> = {};
      for (const p of payments) {
        grouped[p.method] = (grouped[p.method] || 0) + Number(p.amount);
      }
      paymentBreakdown = Object.entries(grouped).map(([method, total]) => ({
        method,
        total: Number(total.toFixed(2)),
      }));
    }

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
        totalPaymentsProcessed: totalTransactions,
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
