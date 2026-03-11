import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    @InjectRepository(PosSession)
    private readonly posSessionRepository: Repository<PosSession>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    await this.posSessionRepository.save(newSession);

    return {
      message: 'POS session opened successfully',
      data: newSession,
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

    if (!session) {
      throw new HttpException('No active session found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Active session retrieved successfully',
      data: session,
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
