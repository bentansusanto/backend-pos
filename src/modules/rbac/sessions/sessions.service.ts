import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { User } from '../users/entities/user.entity';
import { Session } from './entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Find and validate a session by token hash
   * @param tokenHash - Hashed refresh token
   * @returns Session with user and relations, or null if invalid/expired
   */
  async findValidSession(tokenHash: string): Promise<Session | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { token: tokenHash },
        relations: {
          user: {
            userRoles: {
              role: true,
            },
            userBranches: {
              branch: true,
            },
          },
          currentBranch: true,
        },
      });

      if (!session) {
        this.logger.error('SessionService: Token not found in DB');
        return null;
      }

      // Check if session is expired
      if (session.expiresAt && new Date() > session.expiresAt) {
        this.logger.error(
          `SessionService: Session expired. Current: ${new Date()}, Expires: ${session.expiresAt}`,
        );
        await this.sessionRepository.remove(session);
        return null;
      }

      // Check if user is active
      if (!session.user?.isActive) {
        this.logger.error('SessionService: User is not active');
        return null;
      }

      return session;
    } catch (error) {
      this.logger.error('Error finding valid session', error);
      throw error;
    }
  }

  /**
   * Create a new session
   * @param user - User entity
   * @param tokenHash - Hashed refresh token
   * @param expiresAt - Session expiration date
   * @param ip - Client IP address
   * @param device - Device information from User-Agent
   * @returns Created session
   */
  async createSession(
    user: User,
    tokenHash: string,
    expiresAt: Date,
    ip: string,
    device?: string,
  ): Promise<Session> {
    try {
      const session = this.sessionRepository.create({
        token: tokenHash,
        user: user,
        expiresAt: expiresAt,
        ip: ip,
        device: device,
        lastActivityAt: new Date(),
      });

      const savedSession = await this.sessionRepository.save(session);
      this.logger.debug(`Session created for user ${user.id}`);

      return savedSession;
    } catch (error) {
      this.logger.error('Error creating session', error);
      throw error;
    }
  }

  /**
   * Remove a session by token hash
   * @param tokenHash - Hashed refresh token
   */
  async removeSession(tokenHash: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { token: tokenHash },
      });

      if (!session) {
        this.logger.error('SessionService: Token not found in DB');
        return;
      }

      await this.sessionRepository.remove(session);
      this.logger.debug(`Session removed: ${session.id}`);
    } catch (error) {
      this.logger.error('Error removing session', error);
      throw error;
    }
  }

  /**
   * Find session by refresh token
   * @param refreshToken - Hashed refresh token
   * @returns Session with user and role relations
   */
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { token: refreshToken },
        relations: {
          user: {
            userRoles: {
              role: true,
            },
            userBranches: {
              branch: true,
            },
          },
          currentBranch: true,
        },
      });

      return session;
    } catch (error) {
      this.logger.error('Error finding token by refresh token', error.stack);
      return null;
    }
  }

  /**
   * Update session's last activity timestamp
   * @param sessionId - Session ID
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.update(sessionId, {
        lastActivityAt: new Date(),
      });
    } catch (error) {
      this.logger.error('Error updating session activity', error);
      throw error;
    }
  }

  /**
   * Update session's current branch
   * @param sessionId - Session ID
   * @param branchId - Branch ID to set as current
   */
  async updateSessionBranch(
    sessionId: string,
    branchId: string,
  ): Promise<void> {
    try {
      await this.sessionRepository.update(sessionId, {
        currentBranchId: branchId,
      });
      this.logger.debug(`Session ${sessionId} branch updated to ${branchId}`);
    } catch (error) {
      this.logger.error('Error updating session branch', error);
      throw error;
    }
  }

  /**
   * Remove all sessions for a user (logout from all devices)
   * @param userId - User ID
   */
  async removeAllUserSessions(userId: string): Promise<void> {
    try {
      await this.sessionRepository.delete({
        user: { id: userId },
      });
      this.logger.debug(`All sessions removed for user ${userId}`);
    } catch (error) {
      this.logger.error('Error removing all user sessions', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions (for cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now: new Date() })
        .execute();

      const deletedCount = result.affected || 0;
      this.logger.debug(`Cleaned up ${deletedCount} expired sessions`);

      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions', error);
      throw error;
    }
  }
}
