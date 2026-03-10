import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PosSessionResponse } from 'src/types/response/pos-session.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../rbac/users/entities/user.entity';
import {
  ClosePosSessionDto,
  OpenPosSessionDto,
} from './dto/create-pos-session.dto';
import { PosSession, PosSessionStatus } from './entities/pos-session.entity';

@Injectable()
export class PosSessionsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(PosSession)
    private readonly posSessionRepository: Repository<PosSession>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async openSession(
    openPosSessionDto: OpenPosSessionDto,
    user: User,
  ): Promise<PosSessionResponse> {
    try {
      // Check if user already has an open session
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

      const branch = await this.branchRepository.findOne({
        where: { id: openPosSessionDto.branch_id },
      });

      if (!branch) {
        throw new HttpException('Branch not found', HttpStatus.BAD_REQUEST);
      }

      const session = this.posSessionRepository.create({
        ...openPosSessionDto,
        branch,
        user,
        startTime: new Date(),
        status: PosSessionStatus.OPEN,
      });

      const savedSession = await this.posSessionRepository.save(session);

      return {
        message: 'POS Session opened successfully',
        data: {
          id: savedSession.id,
          branch_id: savedSession.branch.id,
          user_id: savedSession.user.id,
          startTime: savedSession.startTime,
          openingBalance: savedSession.openingBalance,
          status: savedSession.status,
          notes: savedSession.notes,
          createdAt: savedSession.createdAt,
          updatedAt: savedSession.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Error opening POS session', error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to open POS session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async closeSession(
    id: string,
    closePosSessionDto: ClosePosSessionDto,
    user: User,
  ): Promise<PosSessionResponse> {
    try {
      const session = await this.posSessionRepository.findOne({
        where: { id, user: { id: user.id } },
        relations: ['branch', 'user'],
      });

      if (!session) {
        throw new HttpException('POS Session not found', HttpStatus.NOT_FOUND);
      }

      if (session.status === PosSessionStatus.CLOSED) {
        throw new HttpException(
          'Session is already closed',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Calculate total sales from completed orders in this session
      const orders = await this.posSessionRepository.manager
        .getRepository('Order')
        .find({
          where: { posSession: { id: session.id }, status: 'completed' },
        });

      const totalSales = orders.reduce((sum, order: any) => {
        const total =
          (order.subtotal ?? 0) +
          (order.tax_amount ?? 0) -
          (order.discount_amount ?? 0);
        return sum + total;
      }, 0);

      session.closingBalance = closePosSessionDto.closingBalance;
      session.endTime = new Date();
      session.status = PosSessionStatus.CLOSED;
      session.notes = closePosSessionDto.notes
        ? `${closePosSessionDto.notes} (Total Sales: Rp${totalSales})`
        : `Total Sales: Rp${totalSales}`;

      const updatedSession = await this.posSessionRepository.save(session);

      return {
        message: 'POS Session closed successfully',
        data: {
          id: updatedSession.id,
          branch_id: updatedSession.branch.id,
          user_id: updatedSession.user.id,
          startTime: updatedSession.startTime,
          endTime: updatedSession.endTime,
          openingBalance: updatedSession.openingBalance,
          closingBalance: updatedSession.closingBalance,
          status: updatedSession.status,
          notes: updatedSession.notes,
          createdAt: updatedSession.createdAt,
          updatedAt: updatedSession.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Error closing POS session', error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to close POS session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getActiveSession(user: User): Promise<PosSessionResponse> {
    try {
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
        };
      }

      return {
        message: 'Active session found',
        data: {
          id: session.id,
          branch_id: session.branch.id,
          user_id: session.user.id,
          startTime: session.startTime,
          openingBalance: session.openingBalance,
          status: session.status,
          notes: session.notes,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Error getting active POS session', error.stack);
      throw new HttpException(
        'Failed to get active POS session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
