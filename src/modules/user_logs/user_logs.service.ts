import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserLogResponse } from 'src/types/response/user-log.type';
import { Repository } from 'typeorm';
import { ActionType, EntityType, UserLog } from './entities/user_log.entity';

export interface LogActivityOptions {
  userId: string;
  branchId?: string;
  action: ActionType;
  entityType: EntityType;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class UserLogsService {
  constructor(
    @InjectRepository(UserLog)
    private readonly userLogRepository: Repository<UserLog>,
  ) {}

  /**
   * Fire-and-forget activity logging.
   * Does NOT block the API response — safe to call without await.
   *
   * Example usage in other services:
   *   this.userLogsService.log({
   *     userId: currentUser.id,
   *     branchId: branch.id,
   *     action: ActionType.CREATE,
   *     entityType: EntityType.PRODUCT,
   *     entityId: product.id,
   *     description: `User created product "${product.name}"`,
   *     metadata: { name: product.name },
   *     ipAddress: req.ip,
   *   });
   */
  log(options: LogActivityOptions): void {
    setImmediate(async () => {
      try {
        const log = this.userLogRepository.create({
          user: options.userId ? { id: options.userId } : undefined,
          branch: options.branchId ? { id: options.branchId } : undefined,
          action: options.action,
          entity_type: options.entityType,
          entity_id: options.entityId ?? null,
          description: options.description,
          metadata: options.metadata ?? null,
          ip_address: options.ipAddress ?? null,
        });
        await this.userLogRepository.save(log);
      } catch (err) {
        // Never throw — logging failure must not affect business logic
      }
    });
  }

  // ─── CRUD for admin dashboard monitoring ───────────────────────────────────

  async findAll(
    branchId?: string,
    userId?: string,
    entityType?: EntityType,
    action?: ActionType,
    limit = 50,
    page = 1,
  ): Promise<UserLogResponse> {
    const where: any = {};
    if (branchId) where.branch = { id: branchId };
    if (userId) where.user = { id: userId };
    if (entityType) where.entity_type = entityType;
    if (action) where.action = action;

    const [logs, total] = await this.userLogRepository.findAndCount({
      where,
      relations: ['user', 'branch'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      message: 'User logs fetched successfully',
      datas: logs.map((log) => ({
        id: log.id,
        user_id: log.user?.id ?? '',
        branch_id: log.branch?.id ?? '',
        action: log.action,
        module: log.entity_type,
        description: log.description,
        metadata: log.metadata,
        ip_address: log.ip_address,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
      total,
      page,
      limit,
    } as any;
  }

  async findOne(id: string): Promise<UserLogResponse> {
    const log = await this.userLogRepository.findOne({
      where: { id },
      relations: ['user', 'branch'],
    });

    if (!log) {
      return { message: 'User log not found', data: null };
    }

    return {
      message: 'User log fetched successfully',
      data: {
        id: log.id,
        user_id: log.user?.id ?? '',
        branch_id: log.branch?.id ?? '',
        action: log.action,
        module: log.entity_type,
        description: log.description,
        metadata: log.metadata,
        ip_address: log.ip_address,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      },
    };
  }

  async findByUser(userId: string, limit = 20): Promise<UserLogResponse> {
    const logs = await this.userLogRepository.find({
      where: { user: { id: userId } },
      relations: ['branch'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      message: 'User activity fetched successfully',
      datas: logs.map((log) => ({
        id: log.id,
        user_id: userId,
        branch_id: log.branch?.id ?? '',
        action: log.action,
        module: log.entity_type,
        description: log.description,
        metadata: log.metadata,
        ip_address: log.ip_address,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
    };
  }
}
