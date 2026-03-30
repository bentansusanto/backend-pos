import { Controller, Get, Post, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorator/permissions.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  @Permissions('system:view')
  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  @Get()
  @ApiOperation({ summary: 'Get latest notifications (Admin only)' })
  @Permissions('system:view') // Assuming admin/owner has this
  findAll(@Query('limit') limit?: number) {
    return this.notificationsService.findAll(limit);
  }

  @Patch(':id/read')
  @Permissions('system:view')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  @Permissions('system:view')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}
