import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../rbac/users/entities/user.entity';
import {
  ClosePosSessionDto,
  OpenPosSessionDto,
} from './dto/create-pos-session.dto';
import { PosSession, PosSessionStatus } from './entities/pos-session.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
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
    this.logger.debug(
      `New POS session ${savedSession.id} opened by user ${user.id} at branch ${branch_id}`,
    );

    // Link existing PENDING orders for this user and branch to the new session
    // Using raw SQL to avoid TypeORM QueryBuilder "pos_session_id" not found error
    this.logger.debug(
      `Attempting to link pending orders to new session ${savedSession.id} for user ${user.id} and branch ${branch_id}`,
    );

    // Using query() directly on the repository
    const updateResult = await this.orderRepository.query(
      `UPDATE orders SET pos_session_id = $1 WHERE user_id = $2 AND branch_id = $3 AND status = $4 AND pos_session_id IS NULL`,
      [savedSession.id, user.id, branch_id, OrderStatus.PENDING],
    );

    const affectedCount = Array.isArray(updateResult) ? updateResult.length : (updateResult[1] || 0);

    this.logger.debug(
      `Session ${savedSession.id} opened: ${affectedCount} pending orders linked`,
    );

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

    // --- Calculate total sales from COMPLETED orders in this session ---
    // Orders are directly related to session (posSession FK), so sum their subtotal
    const completedOrdersForClose =
      session.orders?.filter((o) => o.status === OrderStatus.COMPLETED) || [];
    const totalSales = completedOrdersForClose.reduce(
      (acc, o) =>
        acc +
        Number(o.subtotal || 0) +
        Number(o.tax_amount || 0) -
        Number(o.discount_amount || 0),
      0,
    );

    const openingBal = Number(session.openingBalance || 0);
    const closingBal = Number(closePosSessionDto.closingBalance || 0);
    const expectedCash = openingBal + totalSales;
    const diff = closingBal - expectedCash;

    session.endTime = new Date();
    session.closingBalance = closingBal;
    session.expected_cash = expectedCash;
    session.difference = diff;
    session.notes = closePosSessionDto.notes;
    session.status = PosSessionStatus.CLOSED;

    const saved = await this.posSessionRepository.save(session);

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
        closingBalance: closingBal,
        difference: Number(diff.toFixed(2)),
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

    this.logger.debug(
      `Active session lookup for user ${user?.id}: ${session ? session.id : 'NOT FOUND'}`,
    );

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
      (acc, o) => acc + Number(o.subtotal || 0) + Number(o.tax_amount || 0) - Number(o.discount_amount || 0),
      0,
    );
    const totalTransactions = completedOrders.length;
    this.logger.debug(
      `Session ${id} summary: ${completedOrders.length} completed orders, totalSales=${totalSales}`,
    );

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
