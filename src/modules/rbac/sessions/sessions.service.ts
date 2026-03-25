import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Session } from './entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Find and validate a session by token hash
   * @param tokenHash - Hashed refresh token
   * @returns Session with user and relations, or null if invalid/expired
   */
  async findValidSession(tokenHash: string): Promise<Session | null> {
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
      relations: {
        user: {
          role: true,
          userBranches: {
            branch: true,
          },
        },
        currentBranch: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      await this.sessionRepository.remove(session);
      return null;
    }

    // Check if user is active
    if (!session.user?.isActive) {
      return null;
    }

    return session;
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
    const session = this.sessionRepository.create({
      token: tokenHash,
      user: user,
      expiresAt: expiresAt,
      ip: ip,
      device: device,
      lastActivityAt: new Date(),
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Remove a session by token hash
   * @param tokenHash - Hashed refresh token
   */
  async removeSession(tokenHash: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
    });

    if (!session) {
      return;
    }

    await this.sessionRepository.remove(session);
  }

  /**
   * Find session by refresh token
   * @param refreshToken - Hashed refresh token
   * @returns Session with user and role relations
   */
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { token: refreshToken },
      relations: {
        user: {
          role: true,
          userBranches: {
            branch: true,
          },
        },
        currentBranch: true,
      },
    });
  }

  /**
   * Update session's last activity timestamp
   * @param sessionId - Session ID
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      lastActivityAt: new Date(),
    });
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
    await this.sessionRepository.update(sessionId, {
      currentBranchId: branchId,
    });
  }

  /**
   * Remove all sessions for a user (logout from all devices)
   * @param userId - User ID
   */
  async removeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.delete({
      user: { id: userId },
    });
  }

  /**
   * Clean up expired sessions (for cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
