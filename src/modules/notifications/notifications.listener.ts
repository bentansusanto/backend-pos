import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('pos.session.opened')
  async handleSessionOpened(event: { sessionId: string; cashierName: string; branchName: string }) {
    this.logger.debug(`Handling session opened event: ${event.sessionId}`);
    await this.notificationsService.create({
      type: NotificationType.SESSION,
      title: 'Session Opened',
      message: `${event.cashierName} has opened a new session at ${event.branchName}.`,
      metadata: { sessionId: event.sessionId },
    });
  }

  @OnEvent('pos.session.closed')
  async handleSessionClosed(event: {
    sessionId: string;
    cashierName: string;
    branchName: string;
    difference: number;
    hasAnomaly: boolean;
  }) {
    this.logger.debug(`Handling session closed event: ${event.sessionId}`);
    
    // Always notify about closure
    await this.notificationsService.create({
      type: event.hasAnomaly ? NotificationType.ANOMALY : NotificationType.SESSION,
      title: event.hasAnomaly ? '⚠️ Session Closed with Anomaly' : 'Session Closed',
      message: `${event.cashierName} closed session at ${event.branchName}.${
        event.hasAnomaly ? ` Cash difference detected: ${event.difference}` : ''
      }`,
      metadata: { sessionId: event.sessionId, difference: event.difference },
    });
  }

  @OnEvent('anomaly.detected')
  async handleAnomalyDetected(event: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    metadata?: any;
  }) {
    this.logger.debug(`Handling anomaly detected event: ${event.type}`);
    await this.notificationsService.create({
      type: NotificationType.ANOMALY,
      title: `AI Alert: ${event.type.replace(/_/g, ' ').toUpperCase()}`,
      message: event.message,
      metadata: event.metadata,
    });
  }
}
