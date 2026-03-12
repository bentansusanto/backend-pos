
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './src/modules/orders/entities/order.entity';
import { PosSession } from './src/modules/pos-sessions/entities/pos-session.entity';
import { Payment, PaymentStatus } from './src/modules/payments/entities/payment.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const orderRepo = app.get<Repository<Order>>(getRepositoryToken(Order));
  const sessionRepo = app.get<Repository<PosSession>>(getRepositoryToken(PosSession));
  const paymentRepo = app.get<Repository<Payment>>(getRepositoryToken(Payment));

  console.log('--- DIAGNOSTIC START ---');

  const sessions = await sessionRepo.find({
    relations: ['user', 'branch'],
    order: { createdAt: 'DESC' },
  });

  console.log(`Total Sessions Found: ${sessions.length}`);

  for (const session of sessions) {
    console.log(`\nSession ID: ${session.id} | Status: ${session.status} | Open Balance: ${session.openingBalance}`);
    console.log(`User: ${session.user?.id} (${session.user?.email}) | Branch: ${session.branch?.id} (${session.branch?.name})`);

    // Check payments that SHOULD be counted
    const payments = await paymentRepo.find({
      relations: ['order', 'order.posSession'],
      where: { status: PaymentStatus.SUCCESS }
    });
    
    const sessionPayments = payments.filter(p => p.order?.posSession?.id === session.id);
    console.log(`Successful Payments for this session: ${sessionPayments.length}`);
    for (const p of sessionPayments) {
      console.log(`  - Payment: ${p.id} | Amount: ${p.amount} | Order: ${p.order?.id} | OrderSession: ${p.order?.posSession?.id}`);
    }

    const orders = await orderRepo.find({
      where: { posSession: { id: session.id } }
    });
    console.log(`Linked Orders: ${orders.length}`);
  }

  console.log('\n--- RAW ORDER TABLE CHECK ---');
  const rawOrders = await orderRepo.createQueryBuilder('order')
    .select(['order.id', 'order.pos_session_id', 'order.status'])
    .where('order.status = :status', { status: OrderStatus.PENDING })
    .getRawMany();

  for (const ro of rawOrders) {
    console.log(`Raw Order Data: ${JSON.stringify(ro)}`);
  }

  // Check orphaned orders that might belong to a session but aren't linked
  const orphans = await orderRepo.find({
    where: { posSession: null as any },
    relations: ['user', 'branch'],
    take: 20
  });
  
  console.log(`\nOrphaned Orders (posSession is NULL): ${orphans.length}`);
  for (const o of orphans) {
    const payment = await paymentRepo.findOne({ where: { orderId: o.id } });
    console.log(`  - Order: ${o.id} | Status: ${o.status} | Subtotal: ${o.subtotal} | User: ${o.user?.id} | Branch: ${o.branch?.id} | Payment: ${payment?.status || 'NONE'}`);
  }

  console.log('\n--- ACTIVE SESSION CHECK ---');
  // Check if any session is OPEN
  const openSessions = await sessionRepo.find({ where: { status: 'open' as any }, relations: ['user', 'branch'] });
  console.log(`Open Sessions: ${openSessions.length}`);
  for (const s of openSessions) {
     console.log(`- Open Session: ${s.id} | User: ${s.user?.id} | Branch: ${s.branch?.id}`);
     // Check if there are PENDING orders for this user/branch
     const pending = await orderRepo.find({ 
       where: { 
         user: { id: s.user?.id }, 
         branch: { id: s.branch?.id },
         status: OrderStatus.PENDING,
         posSession: null as any
       } 
     });
     console.log(`  - Pending Orders that SHOULD be linked: ${pending.length}`);
     pending.forEach(p => console.log(`    - Order ${p.id}`));
  }

  console.log('\n--- DIAGNOSTIC END ---');
  await app.close();
}

bootstrap();
