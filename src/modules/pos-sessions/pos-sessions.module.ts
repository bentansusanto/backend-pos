import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../rbac/users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PosSession } from './entities/pos-session.entity';
import { PosSessionsController } from './pos-sessions.controller';
import { PosSessionsService } from './pos-sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PosSession, Branch, User, Order, Payment])],
  controllers: [PosSessionsController],
  providers: [PosSessionsService],
  exports: [PosSessionsService],
})
export class PosSessionsModule {}
