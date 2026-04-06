import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Refund } from '../payments/entities/refund.entity';

@Injectable()
export class SalesReportsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
  ) {}

  // Method untuk mendapatkan sales report berdasarkan filter
  async getSalesReport(filters?: {
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
    paymentMethod?: string;
  }) {
    // Build query for payments with status success or refunded
    let query = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED],
      })
      .andWhere('payment.paid_at IS NOT NULL')
      .orderBy('payment.paid_at', 'DESC');

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

    if (payments.length === 0) {
      return [];
    }

    // Get all order IDs and payment IDs
    const orderIds = payments.map((p) => p.orderId);
    const paymentIds = payments.map((p) => p.id);

    // Get orders with their relations
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...orderIds)', { orderIds })
      .leftJoinAndSelect('order.branch', 'branch')
      .leftJoinAndSelect('order.user', 'cashier')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('order.promotion', 'promotion')
      .getMany();

    // Get refund details
    const refunds = await this.refundRepository.find({
      where: paymentIds.map((pid) => ({ paymentId: pid })),
    });

    // Create lookup maps
    const ordersMap = new Map();
    orders.forEach((order) => {
      ordersMap.set(order.id, order);
    });

    const refundsMap = new Map();
    refunds.forEach((refund) => {
      refundsMap.set(refund.paymentId, refund);
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
      const refund = refundsMap.get(payment.id);
      
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        invoiceNumber: order?.invoice_number || payment.orderId,
        amount: payment.amount ? Number(payment.amount) : 0,
        paymentMethod: payment.method,
        status: payment.status,
        paidAt:
          payment.paid_at instanceof Date
            ? payment.paid_at
            : payment.paid_at
              ? new Date(payment.paid_at)
              : new Date(),
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
            productId: item.variant?.product?.id,
            productName: item.variant?.product?.name_product,
            variantId: item.variant?.id,
            variantName: item.variant?.name_variant,
            quantity: item.quantity,
            price: item.price ? Number(item.price) : 0,
            subtotal: item.subtotal ? Number(item.subtotal) : 0,
          })) || [],
        subtotal: order?.subtotal ? Number(order.subtotal) : 0,
        taxAmount: order?.tax_amount ? Number(order.tax_amount) : 0,
        discountAmount: order?.discount_amount
          ? Number(order.discount_amount)
          : 0,
        totalAmount: Number(payment.amount),
        refundReason: refund?.reason || null,
        refundedAt: refund?.createdAt || null,
        stripeRefundId: refund?.stripeRefundId || null,
        promotionName: order?.promotion?.name || null,
      };
    });
  }

  // Method untuk mendapatkan summary sales report
  async getSalesSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
  }) {
    // Default to last 30 days if no startDate is provided
    const effectiveFilters = { ...filters };
    if (!effectiveFilters.startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      effectiveFilters.startDate = thirtyDaysAgo;
    }

    const salesData = await this.getSalesReport(effectiveFilters);

    const totalSales = salesData.reduce(
      (sum: number, sale: any) => sum + (sale.status === PaymentStatus.SUCCESS ? (sale.amount || 0) : 0),
      0,
    );
    const totalTransactions = salesData.length;
    const averageTransaction =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Count unique customers
    const uniqueCustomerIds = new Set(
      salesData
        .filter((sale) => sale.customer?.id)
        .map((sale) => sale.customer.id),
    );
    const totalCustomers = uniqueCustomerIds.size;

    // Group by payment method (only SUCCESS)
    const paymentMethodSummary = salesData.reduce((acc, sale) => {
      if (sale.status === PaymentStatus.SUCCESS) {
        const method = sale.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + (sale.amount || 0);
      }
      return acc;
    }, {});

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      totalCustomers,
      paymentMethodSummary,
      salesData,
    };
  }

  // Method untuk mendapatkan weekly sales report
  async getWeeklySalesReport(branchId?: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 hari terakhir

    const salesData = await this.getSalesReport({
      startDate,
      endDate: new Date(),
      branchId,
    });

    // Group by day (only SUCCESS)
    const dailySales = salesData.reduce((acc, sale) => {
      if (sale.status === PaymentStatus.SUCCESS) {
        const day =
          sale.paidAt instanceof Date && !isNaN(sale.paidAt.getTime())
            ? sale.paidAt.toISOString().split('T')[0]
            : 'unknown';
        acc[day] = (acc[day] || 0) + (sale.amount || 0);
      }
      return acc;
    }, {});

    const totalSales = salesData.reduce(
      (sum: number, sale: any) => sum + (sale.status === PaymentStatus.SUCCESS ? (sale.amount || 0) : 0),
      0,
    );
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
  }

  // Method untuk mendapatkan monthly sales report
  async getMonthlySalesReport(branchId?: string) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // 1 bulan terakhir

    const salesData = await this.getSalesReport({
      startDate,
      endDate: new Date(),
      branchId,
    });

    // Group by day (only SUCCESS)
    const dailySales = salesData.reduce((acc, sale) => {
      if (sale.status === PaymentStatus.SUCCESS) {
        const day =
          sale.paidAt instanceof Date && !isNaN(sale.paidAt.getTime())
            ? sale.paidAt.toISOString().split('T')[0]
            : 'unknown';
        acc[day] = (acc[day] || 0) + (sale.amount || 0);
      }
      return acc;
    }, {});

    const totalSales = salesData.reduce(
      (sum: number, sale: any) => sum + (sale.status === PaymentStatus.SUCCESS ? (sale.amount || 0) : 0),
      0,
    );
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
  }

  // Method untuk mendapatkan yearly sales report
  async getYearlySalesReport(branchId?: string) {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // 1 tahun terakhir

    const salesData = await this.getSalesReport({
      startDate,
      endDate: new Date(),
      branchId,
    });

    // Group by month (only SUCCESS)
    const monthlySales = salesData.reduce((acc, sale) => {
      if (sale.status === PaymentStatus.SUCCESS) {
        const month = sale.paidAt
          ? sale.paidAt.toISOString().substring(0, 7)
          : 'unknown'; // YYYY-MM
        acc[month] = (acc[month] || 0) + (sale.amount || 0);
      }
      return acc;
    }, {});

    const totalSales = salesData.reduce(
      (sum: number, sale: any) => sum + (sale.status === PaymentStatus.SUCCESS ? (sale.amount || 0) : 0),
      0,
    );
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
  }

  // Export to Excel
  async exportSalesToExcel(filters: any) {
    const data = await this.getSalesReport(filters);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Payment Method', key: 'method', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
    ];

    data.forEach((sale) => {
      worksheet.addRow({
        date: sale.paidAt ? new Date(sale.paidAt).toLocaleString() : '',
        orderId: sale.orderId,
        customer: sale.customer?.name || 'Walk-in',
        branch: sale.branch?.name || '',
        method: sale.paymentMethod,
        amount: sale.amount,
      });
    });

    // Formatting
    worksheet.getRow(1).font = { bold: true };
    worksheet.getColumn('amount').numFmt = '"$"#,##0.00';

    return workbook;
  }

  // Export to PDF
  async exportSalesToPdf(filters: any) {
    const data = await this.getSalesReport(filters);
    const pdfmake = require('pdfmake');
    
    const fonts = {
      Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
      }
    };

    pdfmake.setFonts(fonts);

    const docDefinition = {
      content: [
        { text: 'Sales Report', style: 'header' },
        { text: `Generated on: ${new Date().toLocaleString()}`, margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: [
              ['Date', 'Order ID', 'Method', 'Branch', 'Amount'],
              ...data.map((sale) => [
                sale.paidAt ? new Date(sale.paidAt).toLocaleDateString() : '',
                String(sale.orderId),
                sale.paymentMethod,
                sale.branch?.name || '',
                `$${sale.amount.toFixed(2)}`,
              ]),
            ],
          },
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDoc = await pdfmake.createPdf(docDefinition);
    return pdfDoc.getStream();
  }
}
