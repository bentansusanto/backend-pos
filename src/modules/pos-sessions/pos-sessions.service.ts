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
    this.logger.debug(`New POS session ${savedSession.id} opened by user ${user.id} at branch ${branch_id}`);

    // Link existing PENDING orders for this user and branch to the new session
    // Using QueryBuilder for more reliable filtering and updating of relations
    this.logger.debug(`Attempting to link pending orders to new session ${savedSession.id} for user ${user.id} and branch ${branch_id}`);
    const updateResult = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({ posSession: { id: savedSession.id } } as any)
      .where('user = :userId', { userId: user.id })
      .andWhere('branch = :branchId', { branchId: branch_id })
      .andWhere('status = :status', { status: OrderStatus.PENDING })
      .andWhere('posSession IS NULL')
      .execute();

    this.logger.debug(`Session ${savedSession.id} opened: ${updateResult.affected} pending orders linked`);
    this.logger.debug(
      `Linked ${updateResult.affected || 0} existing pending orders to new session ${savedSession.id}`,
    );

    return {
      message: 'POS session opened successfully',
      data: savedSession,
    };
  }

  async closeSession(
    id: string,
    closePosSessionDto: ClosePosSessionDto,
    user: User,
  ) {
    const session = await this.posSessionRepository.findOne({
      where: { id },
      relations: ['user', 'branch'],
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

    session.endTime = new Date();
    session.closingBalance = closePosSessionDto.closingBalance;
    session.notes = closePosSessionDto.notes;
    session.status = PosSessionStatus.CLOSED;

    await this.posSessionRepository.save(session);

    return {
      message: 'POS session closed successfully',
      data: session,
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
      data: session,
    };
  }

  async getSessionSummary(id: string) {
    const session = await this.posSessionRepository.findOne({
      where: { id },
      relations: ['orders'],
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    // Calculate total sales from successful payments linked to orders in this session
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.order', 'order')
      .where('order.posSession = :id', { id })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .getMany();

    this.logger.debug(`Session ${id} summary: found ${payments.length} successful payments`);

    const totalSales = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const transactionsCount = await this.orderRepository.count({
      where: {
        posSession: { id },
        status: OrderStatus.COMPLETED,
      },
    });

    return {
      message: 'Session summary retrieved successfully',
      data: {
        openingBalance: Number(session.openingBalance || 0),
        totalSales: Number(totalSales.toFixed(2)),
        expectedBalance: Number(
          (Number(session.openingBalance || 0) + totalSales).toFixed(2),
        ),
        transactionsCount,
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
      datas: sessions,
    };
  }
}
