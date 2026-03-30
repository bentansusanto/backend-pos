import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(data: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    // Deduplication: Don't create if there's an identical UNREAD notification
    // This prevents flooding from high-frequency crons
    const existing = await this.notificationRepository.findOne({
      where: {
        title: data.title,
        message: data.message,
        is_read: false,
      }
    });

    if (existing) {
      this.logger.debug(`Skipping duplicate notification: ${data.title}`);
      return existing;
    }

    const notification = this.notificationRepository.create(data);
    const saved = await this.notificationRepository.save(notification);

    // Real-time broadcast via WebSocket
    this.eventsGateway.server.emit('notification_received', saved);
    
    return saved;
  }

  async findAll(limit = 10) {
    return this.notificationRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(id: string) {
    await this.notificationRepository.update(id, { is_read: true });
    return { success: true };
  }

  async markAllAsRead() {
    // Modified per user request: "Clear all indicators" should delete all notifications
    // rather than just marking them as read.
    await this.notificationRepository.delete({});
    return { success: true };
  }

  async getUnreadCount() {
    return this.notificationRepository.count({ where: { is_read: false } });
  }
}
