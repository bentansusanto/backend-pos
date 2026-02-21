import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorPaymentMessage } from 'src/libs/errors/error_payment';
import { successPaymentMessage } from 'src/libs/success/success_payment';
import { PaymentResponse } from 'src/types/response/payment.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { SalesReportsService } from '../sales-reports/sales-reports.service';
import {
  referenceType,
  StockMovement,
} from '../stock-movements/entities/stock-movement.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderService: OrdersService,
    private readonly salesReportsService: SalesReportsService,
  ) {}

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

      // Create and persist payment record
      const payment = this.paymentRepository.create({
        orderId,
        method,
        amount,
        status: PaymentStatus.SUCCESS,
        paid_at: new Date(),
      });
      const savedPayment = await this.paymentRepository.save(payment);

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

          // Load order and ensure it is still pending
          const order = await orderRepo.findOne({
            where: { id: payment.orderId },
            relations: ['items', 'items.product', 'items.variant', 'branch'],
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
              const productStock = await stockRepo.findOne({
                where: {
                  productVariant: { id: item.variant.id },
                  ...(branchId ? { branch: { id: branchId } } : {}),
                },
                relations: ['productVariant', 'branch'],
              });
              if (!productStock) {
                throw new HttpException(
                  'Product variant stock not found',
                  HttpStatus.NOT_FOUND,
                );
              }
              if (productStock.stock < quantity) {
                throw new HttpException(
                  'Product variant stock is insufficient',
                  HttpStatus.BAD_REQUEST,
                );
              }
              // Update stock quantity
              productStock.stock = productStock.stock - quantity;
              productStock.updatedAt = new Date();
              await stockRepo.save(productStock);

              if (branchId) {
                // Create stock movement record
                const movement = movementRepo.create({
                  productVariant: { id: item.variant.id },
                  branch: { id: branchId },
                  referenceType: referenceType.SALE,
                  qty: quantity,
                  referenceId: order.id,
                });
                await movementRepo.save(movement);
              }
              continue;
            }

            if (item.product?.id) {
              // Handle product stock updates
              const productStock = await stockRepo.findOne({
                where: {
                  product: { id: item.product.id },
                  ...(branchId ? { branch: { id: branchId } } : {}),
                },
                relations: ['product', 'branch'],
              });
              if (!productStock) {
                const variantStocks = await stockRepo.find({
                  where: {
                    productVariant: { product: { id: item.product.id } },
                    ...(branchId ? { branch: { id: branchId } } : {}),
                  },
                  relations: [
                    'productVariant',
                    'branch',
                    'productVariant.product',
                  ],
                });
                if (!variantStocks.length) {
                  throw new HttpException(
                    'Product stock not found',
                    HttpStatus.NOT_FOUND,
                  );
                }
                let remaining = quantity;
                for (const variantStock of variantStocks) {
                  if (remaining <= 0) break;
                  const available = Number(variantStock.stock ?? 0);
                  if (!Number.isFinite(available) || available <= 0) {
                    continue;
                  }
                  const deduction = Math.min(available, remaining);
                  variantStock.stock = available - deduction;
                  variantStock.updatedAt = new Date();
                  await stockRepo.save(variantStock);
                  if (branchId && variantStock.productVariant?.id) {
                    const movement = movementRepo.create({
                      productVariant: { id: variantStock.productVariant.id },
                      branch: { id: branchId },
                      referenceType: referenceType.SALE,
                      qty: deduction,
                      referenceId: order.id,
                    });
                    await movementRepo.save(movement);
                  }
                  remaining -= deduction;
                }
                if (remaining > 0) {
                  throw new HttpException(
                    'Product stock is insufficient',
                    HttpStatus.BAD_REQUEST,
                  );
                }
                continue;
              }
              if (productStock.stock < quantity) {
                throw new HttpException(
                  'Product stock is insufficient',
                  HttpStatus.BAD_REQUEST,
                );
              }
              // Update stock quantity
              productStock.stock = productStock.stock - quantity;
              productStock.updatedAt = new Date();
              await stockRepo.save(productStock);
            }
          }

          // Update order status to completed
          order.status = OrderStatus.COMPLETED;
          order.updatedAt = new Date();
          await orderRepo.save(order);

          // Mark payment as successful
          payment.status = PaymentStatus.SUCCESS;
          payment.paid_at = new Date();
          const savedPayment = await paymentRepo.save(payment);

          // Return both payment and order for sales report creation
          return {
            payment: savedPayment,
            order: order,
          };
        },
      );

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

  async findAll(): Promise<PaymentResponse> {
    try {
      const payments = await this.paymentRepository.find();
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

  update(id: string, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: string) {
    return `This action removes a #${id} payment`;
  }
}
