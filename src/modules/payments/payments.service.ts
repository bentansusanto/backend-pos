import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorPaymentMessage } from 'src/libs/errors/error_payment';
import { successPaymentMessage } from 'src/libs/success/success_payment';
import { PaymentResponse } from 'src/types/response/payment.type';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { PosSessionsService } from '../pos-sessions/pos-sessions.service';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { SalesReportsService } from '../sales-reports/sales-reports.service';
import { EventsGateway } from '../events/events.gateway';
import { AccountingService } from '../accounting/accounting.service';
import { ReferenceType as AccReferenceType } from '../accounting/entities/accounting.enums';
import {
  ReferenceType,
  StockMovement,
} from '../stock-movements/entities/stock-movement.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderService: OrdersService,
    private readonly posSessionsService: PosSessionsService,
    private readonly salesReportsService: SalesReportsService,
    private readonly configService: ConfigService,
    private readonly accountingService: AccountingService,
    private readonly eventsGateway: EventsGateway,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.logger.debug(
      `Initializing Stripe with key prefix: ${secretKey?.substring(0, 7)}...`,
    );

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any, // Fixed invalid version
    });
  }

  // create payment
  async create(createPaymentDto: CreatePaymentDto): Promise<PaymentResponse> {
    try {
      // Validate input payload
      const { orderId, method } = createPaymentDto;
      if (!orderId) {
        throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
      }

      // Load order and ensure status is pending
      const orderResult = await this.orderService.findOne(orderId);
      if (!orderResult?.data) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      if (orderResult.data.status !== OrderStatus.PENDING) {
        throw new HttpException(
          'Order status is not pending',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Use order total as payment amount
      const amount = Number(orderResult.data.total_amount ?? 0);

      let stripeClientSecret: string | undefined;
      let paymentStatus = PaymentStatus.PENDING;
      let externalId: string | undefined;

      if (method === PaymentMethod.STRIPE) {
        try {
          const currency = this.configService.get<string>('STRIPE_CURRENCY') || 'usd';
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amount in cents
            currency,
            metadata: {
              orderId,
            },
          });
          stripeClientSecret = paymentIntent.client_secret;
          externalId = paymentIntent.id;
        } catch (stripeError) {
          this.logger.error('Stripe PaymentIntent Creation Failed', {
            message: stripeError.message,
            stack: stripeError.stack,
            type: stripeError.type,
            code: stripeError.code,
          });
          throw new HttpException(
            `Stripe payment initialization failed: ${stripeError.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      } else if (method === PaymentMethod.CASH) {
        // Keep as PENDING so verifyPayment can run the full flow (order status, stock, etc.)
        paymentStatus = PaymentStatus.PENDING;
      }

      // Create and persist payment record
      const payment = this.paymentRepository.create({
        orderId,
        method,
        amount,
        status: paymentStatus,
        externalId,
        paid_at: method === PaymentMethod.CASH ? new Date() : null,
      });
      const savedPayment = await this.paymentRepository.save(payment);

      // If CASH, finalize the order immediately (stock update, status to COMPLETED)
      if (method === PaymentMethod.CASH) {
        await this.verifyPayment(savedPayment.id);

        // Reload to get updated paid_at and other fields
        const updatedPayment = await this.paymentRepository.findOne({
          where: { id: savedPayment.id }
        });
        if (updatedPayment) {
          return {
            message: successPaymentMessage.SUCCESS_CREATE_PAYMENT,
            data: {
              id: updatedPayment.id,
              orderId: updatedPayment.orderId,
              amount: updatedPayment.amount,
              status: updatedPayment.status,
              paymentMethod: updatedPayment.method,
              paid_at: updatedPayment.paid_at,
              createdAt: updatedPayment.createdAt,
              updatedAt: updatedPayment.updatedAt,
            },
          };
        }
      }


      // Map entity to response contract
      return {
        message: successPaymentMessage.SUCCESS_CREATE_PAYMENT,
        data: {
          id: savedPayment.id,
          orderId: savedPayment.orderId,
          amount: savedPayment.amount,
          status: savedPayment.status,
          paymentMethod: savedPayment.method,
          paid_at: savedPayment.paid_at,
          createdAt: savedPayment.createdAt,
          updatedAt: savedPayment.updatedAt,
          ...(stripeClientSecret ? { client_secret: stripeClientSecret } : {}),
        },
      };
    } catch (error) {
      this.logger.error(errorPaymentMessage.ERROR_CREATE_PAYMENT, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorPaymentMessage.ERROR_CREATE_PAYMENT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      // Validate payment id
      if (!paymentId) {
        throw new HttpException(
          'Payment ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Run verification flow atomically
      const result = await this.paymentRepository.manager.transaction(
        async (manager) => {
          // Resolve transaction repositories
          const paymentRepo = manager.getRepository(Payment);
          const orderRepo = manager.getRepository(Order);
          const stockRepo = manager.getRepository(ProductStock);
          const movementRepo = manager.getRepository(StockMovement);

          // Find payment by id
          const payment = await paymentRepo.findOne({
            where: { id: paymentId },
          });
          if (!payment) {
            throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
          }

          // If payment is already success, just return the payment and order
          if (payment.status === PaymentStatus.SUCCESS) {
            const order = await orderRepo.findOne({
              where: { id: payment.orderId },
              relations: ['items', 'items.variant', 'branch'],
            });
            return { payment, order };
          }

          // Load order and ensure it is still pending
          const order = await orderRepo.findOne({
            where: { id: payment.orderId },
            relations: ['items', 'items.variant', 'branch', 'posSession', 'user'],
          });
          if (!order) {
            throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
          }
          if (order.status !== OrderStatus.PENDING) {
            throw new HttpException(
              'Order status is not pending',
              HttpStatus.BAD_REQUEST,
            );
          }

          // Decrease stock per order item and record movements
          const branchId = order.branch?.id ?? '';
          for (const item of order.items || []) {
            // Skip invalid quantities
            const quantity = Number(item.quantity ?? 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
              continue;
            }

            if (item.variant?.id) {
              // Handle variant stock updates
              const productStocks = await stockRepo.find({
                where: {
                  productVariant: { id: item.variant.id },
                  ...(branchId ? { branch: { id: branchId } } : {}),
                },
                relations: ['productVariant', 'branch'],
              });
              if (productStocks.length === 0) {
                throw new HttpException(
                  'Product variant stock not found',
                  HttpStatus.NOT_FOUND,
                );
              }
              const totalAvailableStock = productStocks.reduce((sum, s) => sum + s.stock, 0);
              if (totalAvailableStock < quantity) {
                throw new HttpException(
                  'Product variant stock is insufficient',
                  HttpStatus.BAD_REQUEST,
                );
              }
              // Update stock quantity (deduct from the first record)
              const primaryStock = productStocks[0];
              primaryStock.stock = primaryStock.stock - quantity;
              primaryStock.updatedAt = new Date();
              await stockRepo.save(primaryStock);

              if (branchId) {
                // Create stock movement record
                const movement = movementRepo.create({
                  productVariant: { id: item.variant.id },
                  branch: { id: branchId },
                  referenceType: ReferenceType.SALE,
                  qty: quantity,
                  referenceId: order.id,
                });
                await movementRepo.save(movement);
              }
            }
          }

          // Update order status to completed
          order.status = OrderStatus.COMPLETED;
          order.updatedAt = new Date();

          // Safety net: Ensure order is linked to a POS session if not already
          let posSessionId = order.posSession?.id ?? null;
          if (!posSessionId && order.user) {
            const sessionResponse = await this.posSessionsService.getActiveSession(order.user);
            if (sessionResponse?.data) {
              posSessionId = sessionResponse.data.id;
              this.logger.debug(`PaymentsService: Linking order ${order.id} to active session ${posSessionId} during verification`);
            }
          }

          // Use raw SQL for reliable update inside transaction —
          // TypeORM QueryBuilder .set() does not handle FK relation objects correctly
          await manager.query(
            `UPDATE orders SET status = $1, pos_session_id = $2, "updatedAt" = NOW() WHERE id = $3`,
            [OrderStatus.COMPLETED, posSessionId, order.id],
          );
          this.logger.debug(`Order ${order.id} updated: status=completed, pos_session_id=${posSessionId}`);

          // Re-load fresh order after update
          const updatedOrder = await orderRepo.findOne({
            where: { id: order.id },
            relations: ['items', 'items.variant', 'branch', 'posSession'],
          });
          // Broadcast real-time stock updates
          if (updatedOrder?.items) {
            for (const item of updatedOrder.items) {
              if (item.variant) {
                // Fetch new stock level for this variant at this branch
                // (Already updated in verifyPayment transaction)
                const freshStock = await manager.findOne(ProductStock, {
                  where: {
                    productVariant: { id: item.variant.id },
                    branch: { id: updatedOrder.branch.id },
                  },
                });
                
                if (freshStock) {
                  this.eventsGateway.broadcastStockUpdate({
                    variantId: item.variant.id,
                    branchId: updatedOrder.branch.id,
                    newStock: freshStock.stock,
                  });
                }
              }
            }
          }

          // Mark payment as successful
          payment.status = PaymentStatus.SUCCESS;
          payment.paid_at = new Date();
          const savedPayment = await paymentRepo.save(payment);

          // Return both payment and order for sales report creation
          return {
            payment: savedPayment,
            order: updatedOrder ?? order,
          };
        },
      );

      // --- Post-transaction: Create Journal Entry for the Sale ---
      try {
        const order = result.order;
        const totalAmount = result.payment.amount;
        const taxAmount = order.tax_amount ?? 0;
        const subtotal = order.subtotal ?? 0;
        const discountAmount = order.discount_amount ?? 0;

        // Fetch default accounts
        const cashAccount = await this.accountingService.getAccountByCode('1000'); // General Cash
        const revenueAccount = await this.accountingService.getAccountByCode('4000'); // Sales Revenue
        const taxAccount = await this.accountingService.getAccountByCode('2010'); // Value Added Tax Payable
        const discountAccount = await this.accountingService.getAccountByCode('5010'); // Cost of Sales / Discounts or similar (fallback to revenue contra)
        
        // Only proceed if at least Cash and Revenue exist
        if (cashAccount && revenueAccount) {
          const lines = [];

          // Debit: Cash (Total paid by customer)
          lines.push({
            accountId: cashAccount.id,
            debit: totalAmount,
            credit: 0,
          });

          // Debit: Discount (If any)
          if (discountAmount > 0 && discountAccount) {
            lines.push({
              accountId: discountAccount.id,
              debit: discountAmount,
              credit: 0,
            });
          }

          // Credit: Revenue (Subtotal)
          lines.push({
            accountId: revenueAccount.id,
            debit: 0,
            credit: subtotal,
          });

          // Credit: Tax
          if (taxAmount > 0 && taxAccount) {
            lines.push({
              accountId: taxAccount.id,
              debit: 0,
              credit: taxAmount,
            });
          }

          // In a full perp system we would also log COGS vs Inventory here
          // For now, we log the sales transaction side.

          await this.accountingService.createJournalEntry({
            date: new Date().toISOString(),
            referenceType: AccReferenceType.SALE,
            referenceCode: order.invoice_number,
            description: `Sales revenue for Invoice ${order.invoice_number}`,
            branchId: order.branch?.id,
            journalLines: lines
          });
          this.logger.debug(`Successfully generated auto-journal for order ${order.id}`);
        } else {
          this.logger.warn('Could not generate auto-journal: Default accounts (1000 or 4000) not found.');
        }
      } catch (accountingError) {
        // We catch and log this instead of throwing, so the payment itself doesn't fail 
        // if just the auto-journal integration part fails.
        this.logger.error('Failed to auto-generate accounting journal', accountingError.stack);
      }

      // Map entity to response contract
      return {
        message: successPaymentMessage.SUCCESS_PAYMENT,
        data: {
          id: result.payment.id,
          orderId: result.payment.orderId,
          amount: result.payment.amount,
          status: result.payment.status,
          paymentMethod: result.payment.method,
          paid_at: result.payment.paid_at,
          createdAt: result.payment.createdAt,
          updatedAt: result.payment.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errorPaymentMessage.ERROR_PAYMENT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorPaymentMessage.ERROR_PAYMENT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(branchId?: string): Promise<PaymentResponse> {
    try {
      const whereCondition = branchId
        ? { order: { branch: { id: branchId } } }
        : {};

      const payments = await this.paymentRepository.find({
        where: whereCondition,
        relations: ['order', 'order.branch'],
      });

      if (!payments || payments.length === 0) {
        throw new HttpException(
          errorPaymentMessage.ERROR_GET_PAYMENTS,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successPaymentMessage.SUCCESS_GET_PAYMENTS,
        datas: payments.map((payment) => ({
          id: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.method,
          paid_at: payment.paid_at,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errorPaymentMessage.ERROR_GET_PAYMENTS, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorPaymentMessage.ERROR_GET_PAYMENTS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<PaymentResponse> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id },
      });

      if (!payment) {
        throw new HttpException(
          errorPaymentMessage.ERROR_GET_PAYMENT,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successPaymentMessage.SUCCESS_GET_PAYMENT,
        data: {
          id: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.method,
          paid_at: payment.paid_at,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errorPaymentMessage.ERROR_GET_PAYMENT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorPaymentMessage.ERROR_GET_PAYMENT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleStripeWebhook(payload: any, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err.message);
      throw new HttpException('Webhook Error', HttpStatus.BAD_REQUEST);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.debug(
          `PaymentIntent was successful! ID: ${paymentIntent.id}`,
        );
        await this.handlePaymentSuccess(paymentIntent);
        break;
      // ... handle other event types
      default:
        this.logger.debug(`Unhandled event type ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentRepository.findOne({
      where: { externalId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.error(
        `Payment not found for externalId: ${paymentIntent.id}`,
      );
      return;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.debug(`Payment ${payment.id} is already success`);
      return;
    }

    // Call verifyPayment to finalize the order and stock
    await this.verifyPayment(payment.id);
  }

  async update(id: string, _updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  async remove(id: string) {
    return `This action removes a #${id} payment`;
  }
}
