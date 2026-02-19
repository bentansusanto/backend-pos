import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class SalesReportsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // Method untuk mendapatkan sales report berdasarkan filter
  async getSalesReport(filters?: {
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
    paymentMethod?: string;
  }) {
    try {
      // Build query untuk mendapatkan payment yang success dengan join manual ke order
      let query = this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'success' })
        .andWhere('payment.paid_at IS NOT NULL');

      // Apply filters jika ada
      if (filters?.startDate) {
        query = query.andWhere('payment.paid_at >= :startDate', {
          startDate: filters.startDate,
        });
      }
      if (filters?.endDate) {
        query = query.andWhere('payment.paid_at <= :endDate', {
          endDate: filters.endDate,
        });
      }
      if (filters?.paymentMethod) {
        query = query.andWhere('payment.method = :paymentMethod', {
          paymentMethod: filters.paymentMethod,
        });
      }

      const payments = await query.getMany();

      // Get all order IDs from payments
      const orderIds = payments.map((p) => p.orderId);

      // Get orders with their relations
      const orders = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.id IN (:...orderIds)', { orderIds })
        .leftJoinAndSelect('order.branch', 'branch')
        .leftJoinAndSelect('order.user', 'cashier')
        .leftJoinAndSelect('order.customer', 'customer')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .leftJoinAndSelect('items.variant', 'variant')
        .getMany();

      // Create a map of orders by ID for easy lookup
      const ordersMap = new Map();
      orders.forEach((order) => {
        ordersMap.set(order.id, order);
      });

      // Apply branch filter after we have the orders
      let filteredPayments = payments;
      if (filters?.branchId) {
        filteredPayments = payments.filter((payment) => {
          const order = ordersMap.get(payment.orderId);
          return order && order.branch && order.branch.id === filters.branchId;
        });
      }

      // Format data untuk response
      return filteredPayments.map((payment) => {
        const order = ordersMap.get(payment.orderId);
        return {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          paymentMethod: payment.method,
          paidAt: payment.paid_at,
          branch: order?.branch
            ? {
                id: order.branch.id,
                name: order.branch.name,
              }
            : null,
          cashier: order?.user
            ? {
                id: order.user.id,
                name: order.user.name,
              }
            : null,
          customer: order?.customer
            ? {
                id: order.customer.id,
                name: order.customer.name,
              }
            : null,
          items:
            order?.items?.map((item) => ({
              productId: item.product?.id,
              productName: item.product?.name_product,
              variantId: item.variant?.id,
              variantName: item.variant?.name_variant,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })) || [],
          subtotal: order?.subtotal,
          taxAmount: order?.tax_amount,
          discountAmount: order?.discount_amount,
          totalAmount: payment.amount,
        };
      });
    } catch (error) {
      this.logger.error('Error getting sales report', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get sales report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method untuk mendapatkan summary sales report
  async getSalesSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
  }) {
    try {
      const salesData = await this.getSalesReport(filters);

      const totalSales = salesData.reduce((sum, sale) => sum + sale.amount, 0);
      const totalTransactions = salesData.length;
      const averageTransaction =
        totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Group by payment method
      const paymentMethodSummary = salesData.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.amount;
        return acc;
      }, {});

      return {
        totalSales,
        totalTransactions,
        averageTransaction,
        paymentMethodSummary,
        salesData,
      };
    } catch (error) {
      this.logger.error('Error getting sales summary', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get sales summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method untuk mendapatkan weekly sales report
  async getWeeklySalesReport(branchId?: string) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 hari terakhir

      const salesData = await this.getSalesReport({
        startDate,
        endDate: new Date(),
        branchId,
      });

      // Group by day
      const dailySales = salesData.reduce((acc, sale) => {
        const day = sale.paidAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + sale.amount;
        return acc;
      }, {});

      const totalSales = salesData.reduce((sum, sale) => sum + sale.amount, 0);
      const totalTransactions = salesData.length;

      return {
        period: 'weekly',
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        totalSales,
        totalTransactions,
        averageTransaction:
          totalTransactions > 0 ? totalSales / totalTransactions : 0,
        dailySales,
        salesData,
      };
    } catch (error) {
      this.logger.error('Error getting weekly sales report', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get weekly sales report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method untuk mendapatkan monthly sales report
  async getMonthlySalesReport(branchId?: string) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // 1 bulan terakhir

      const salesData = await this.getSalesReport({
        startDate,
        endDate: new Date(),
        branchId,
      });

      // Group by day
      const dailySales = salesData.reduce((acc, sale) => {
        const day = sale.paidAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + sale.amount;
        return acc;
      }, {});

      const totalSales = salesData.reduce((sum, sale) => sum + sale.amount, 0);
      const totalTransactions = salesData.length;

      return {
        period: 'monthly',
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        totalSales,
        totalTransactions,
        averageTransaction:
          totalTransactions > 0 ? totalSales / totalTransactions : 0,
        dailySales,
        salesData,
      };
    } catch (error) {
      this.logger.error('Error getting monthly sales report', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get monthly sales report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method untuk mendapatkan yearly sales report
  async getYearlySalesReport(branchId?: string) {
    try {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1); // 1 tahun terakhir

      const salesData = await this.getSalesReport({
        startDate,
        endDate: new Date(),
        branchId,
      });

      // Group by month
      const monthlySales = salesData.reduce((acc, sale) => {
        const month = sale.paidAt.toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + sale.amount;
        return acc;
      }, {});

      const totalSales = salesData.reduce((sum, sale) => sum + sale.amount, 0);
      const totalTransactions = salesData.length;

      return {
        period: 'yearly',
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        totalSales,
        totalTransactions,
        averageTransaction:
          totalTransactions > 0 ? totalSales / totalTransactions : 0,
        monthlySales,
        salesData,
      };
    } catch (error) {
      this.logger.error('Error getting yearly sales report', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get yearly sales report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
