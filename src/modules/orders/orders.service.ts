import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errOrderMessage } from 'src/libs/errors/error_order';
import { successOrderMessage } from 'src/libs/success/success_order';
import { OrderResponse } from 'src/types/response/order.type';
import { In, Repository } from 'typeorm';
import { Logger } from 'winston';
import { Customer } from '../customers/entities/customer.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  // create orders
  async create(createOrderDto: CreateOrderDto): Promise<OrderResponse> {
    try {
      const { items, notes, order_id, branch_id, user_id, customer_id } =
        createOrderDto;
      // Step 1: Normalize items so each product/variant has a single entry
      const aggregatedItems = new Map<
        string,
        {
          quantity: number;
          price: number;
          variantId?: string;
          productId?: string;
        }
      >();

      items.forEach((item) => {
        // Validate quantity and require productId or variantId
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new HttpException(
            'Quantity must be greater than 0',
            HttpStatus.BAD_REQUEST,
          );
        }
        const variantId = item.variantId?.trim() || '';
        const productId = item.productId?.trim() || '';
        if (!variantId && !productId) {
          throw new HttpException(
            'Product ID or variant ID is required',
            HttpStatus.BAD_REQUEST,
          );
        }
        // Merge same item so quantity is accumulated
        const key = variantId ? `variant:${variantId}` : `product:${productId}`;
        const existing = aggregatedItems.get(key);
        if (existing) {
          aggregatedItems.set(key, {
            ...existing,
            quantity: existing.quantity + quantity,
            price: item.price,
          });
        } else {
          aggregatedItems.set(key, {
            quantity,
            price: item.price,
            variantId: variantId || undefined,
            productId: productId || undefined,
          });
        }
      });

      const variantIds = Array.from(aggregatedItems.values())
        .map((item) => item.variantId)
        .filter((id): id is string => Boolean(id));
      const productIds = Array.from(aggregatedItems.values())
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id));

      // Step 2: Validate product/variant references against database
      const [variants, products] = await Promise.all([
        variantIds.length
          ? this.productVariantRepository.find({
              where: { id: In(variantIds) },
              relations: ['product'],
            })
          : Promise.resolve([]),
        productIds.length
          ? this.productRepository.find({ where: { id: In(productIds) } })
          : Promise.resolve([]),
      ]);

      if (variants.length !== variantIds.length) {
        throw new HttpException(
          'Product variant not found',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (products.length !== productIds.length) {
        throw new HttpException('Product not found', HttpStatus.BAD_REQUEST);
      }

      const variantMap = new Map(
        variants.map((variant) => [variant.id, variant]),
      );
      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      // Step 3: Check product/variant stock in product_stocks, filter by branch if provided
      const stockWhere = [];
      if (variantIds.length) {
        stockWhere.push({
          productVariant: { id: In(variantIds) },
          ...(branch_id ? { branch: { id: branch_id } } : {}),
        });
      }
      if (productIds.length) {
        stockWhere.push({
          product: { id: In(productIds) },
          ...(branch_id ? { branch: { id: branch_id } } : {}),
        });
      }
      const productStocksPromise = stockWhere.length
        ? this.productStockRepository.find({
            where: stockWhere,
            relations: ['productVariant', 'product', 'branch'],
          })
        : Promise.resolve([]);

      const existingOrderPromise = order_id
        ? this.orderRepository.findOne({
            where: { id: order_id },
            relations: [
              'items',
              'items.product',
              'items.variant',
              'branch',
              'user',
              'customer',
            ],
          })
        : Promise.resolve(null);

      const [productStocks, existingOrderResult] = await Promise.all([
        productStocksPromise,
        existingOrderPromise,
      ]);

      const variantStockMap = new Map(
        productStocks
          .filter((stock) => stock.productVariant?.id)
          .map((stock) => [stock.productVariant.id, stock]),
      );
      const productStockMap = new Map(
        productStocks
          .filter((stock) => stock.product?.id)
          .map((stock) => [stock.product.id, stock]),
      );

      // Step 4: Ensure stock is sufficient for each requested item
      aggregatedItems.forEach((item) => {
        if (item.variantId) {
          const stock = variantStockMap.get(item.variantId);
          if (!stock) {
            throw new HttpException(
              'Product variant stock not found',
              HttpStatus.BAD_REQUEST,
            );
          }
          if (stock.stock < item.quantity) {
            throw new HttpException(
              'Product variant stock is insufficient',
              HttpStatus.BAD_REQUEST,
            );
          }
          return;
        }
        if (item.productId) {
          const stock = productStockMap.get(item.productId);
          if (!stock) {
            throw new HttpException(
              'Product stock not found',
              HttpStatus.BAD_REQUEST,
            );
          }
          if (stock.stock < item.quantity) {
            throw new HttpException(
              'Product stock is insufficient',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      });

      // Step 5: Load existing order if provided, only proceed when status is active
      let existingOrder: Order | null = existingOrderResult;
      if (
        existingOrder &&
        (existingOrder.status === OrderStatus.COMPLETED ||
          existingOrder.status === OrderStatus.CANCELLED)
      ) {
        existingOrder = null;
      }

      // Step 6: Run transaction to keep order and order items consistent
      const result = await this.orderRepository.manager.transaction(
        async (manager) => {
          const orderRepo = manager.getRepository(Order);
          const orderItemRepo = manager.getRepository(OrderItem);

          if (!existingOrder) {
            // Flow A: Create new order when no active order is available
            const createdOrder = orderRepo.create({
              invoice_number: `INV-${Date.now()}`,
              notes,
              status: OrderStatus.PENDING,
              branch: branch_id ? { id: branch_id } : undefined,
              user: user_id ? { id: user_id } : undefined,
              customer: customer_id ? { id: customer_id } : undefined,
            });
            const savedOrder = await orderRepo.save(createdOrder);

            // Add new order items based on payload
            const newItems = Array.from(aggregatedItems.values()).map(
              (item) => {
                const variant = item.variantId
                  ? variantMap.get(item.variantId)
                  : undefined;
                const product = item.productId
                  ? productMap.get(item.productId)
                  : variant?.product;
                const subtotal = item.quantity * item.price;
                return orderItemRepo.create({
                  order: savedOrder,
                  product,
                  variant,
                  quantity: item.quantity,
                  price: item.price,
                  subtotal,
                });
              },
            );
            await orderItemRepo.save(newItems);

            // Calculate order subtotal from all items
            const subtotal = newItems.reduce(
              (total, item) => total + item.subtotal,
              0,
            );
            savedOrder.subtotal = subtotal;
            savedOrder.tax_amount = savedOrder.tax_amount ?? 0;
            savedOrder.discount_amount = savedOrder.discount_amount ?? 0;
            const finalOrder = await orderRepo.save(savedOrder);

            return { order: finalOrder, items: newItems };
          }

          const updatedExistingItems = (existingOrder.items || []).map(
            (item) => {
              // Flow B1: If item exists, increase qty and recompute subtotal
              const key = item.variant?.id
                ? `variant:${item.variant.id}`
                : item.product?.id
                  ? `product:${item.product.id}`
                  : '';
              if (!key) {
                return item;
              }
              const incoming = aggregatedItems.get(key);
              if (!incoming) {
                return item;
              }
              item.quantity = item.quantity + incoming.quantity;
              item.price = incoming.price;
              item.subtotal = item.quantity * item.price;
              aggregatedItems.delete(key);
              return item;
            },
          );

          // Flow B2: Add new items that are not in the order yet
          const newItems = Array.from(aggregatedItems.values()).map((item) => {
            const variant = item.variantId
              ? variantMap.get(item.variantId)
              : undefined;
            const product = item.productId
              ? productMap.get(item.productId)
              : variant?.product;
            return orderItemRepo.create({
              order: existingOrder,
              product,
              variant,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            });
          });

          const allItems = [...updatedExistingItems, ...newItems];
          await orderItemRepo.save(allItems);

          // Recalculate order subtotal after update/insert
          const subtotal = allItems.reduce(
            (total, item) => total + item.subtotal,
            0,
          );
          const updatedOrder = orderRepo.create({
            ...existingOrder,
            notes: notes ?? existingOrder.notes,
            subtotal,
          });
          const savedOrder = await orderRepo.save(updatedOrder);

          return { order: savedOrder, items: allItems };
        },
      );

      // Step 7: Compute total_amount from subtotal + tax - discount
      const totalAmount =
        (result.order.subtotal ?? 0) +
        (result.order.tax_amount ?? 0) -
        (result.order.discount_amount ?? 0);

      // Step 8: Map entities to response contract
      return {
        message: successOrderMessage.SUCCESS_CREATE_ORDER,
        data: {
          id: result.order.id,
          customer_id: result.order.customer?.id ?? '',
          branch_id: result.order.branch?.id ?? '',
          user_id: result.order.user?.id ?? '',
          items: result.items.map((item) => ({
            id: item.id,
            order_id: result.order.id,
            product_id: item.product?.id ?? '',
            variant_id: item.variant?.id ?? '',
            qty: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          invoice_number: result.order.invoice_number,
          subtotal: result.order.subtotal ?? 0,
          tax_amount: result.order.tax_amount ?? 0,
          total_amount: totalAmount,
          status: result.order.status,
          created_at: result.order.createdAt,
          updated_at: result.order.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errOrderMessage.ERR_CREATE_ORDER, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errOrderMessage.ERR_CREATE_ORDER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<OrderResponse> {
    try {
      const orders = await this.orderRepository.find({
        relations: [
          'items',
          'items.product',
          'items.variant',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!orders || orders.length === 0) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDERS,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        message: successOrderMessage.SUCCESS_GET_ORDERS,
        datas: orders.map((order) => {
          const totalAmount =
            (order.subtotal ?? 0) +
            (order.tax_amount ?? 0) -
            (order.discount_amount ?? 0);
          return {
            id: order.id,
            customer_id: order.customer?.id ?? '',
            branch_id: order.branch?.id ?? '',
            user_id: order.user?.id ?? '',
            items: (order.items || []).map((item) => ({
              id: item.id,
              order_id: order.id,
              product_id: item.product?.id ?? '',
              variant_id: item.variant?.id ?? '',
              qty: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
            invoice_number: order.invoice_number,
            subtotal: order.subtotal ?? 0,
            tax_amount: order.tax_amount ?? 0,
            total_amount: totalAmount,
            status: order.status,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
          };
        }),
      };
    } catch (error) {
      this.logger.error(errOrderMessage.ERR_GET_ORDERS, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errOrderMessage.ERR_GET_ORDERS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<OrderResponse> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id },
        relations: [
          'items',
          'items.product',
          'items.variant',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!order) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER,
          HttpStatus.NOT_FOUND,
        );
      }

      const totalAmount =
        (order.subtotal ?? 0) +
        (order.tax_amount ?? 0) -
        (order.discount_amount ?? 0);

      return {
        message: successOrderMessage.SUCCESS_GET_ORDER,
        data: {
          id: order.id,
          customer_id: order.customer?.id ?? '',
          branch_id: order.branch?.id ?? '',
          user_id: order.user?.id ?? '',
          items: (order.items || []).map((item) => ({
            id: item.id,
            order_id: order.id,
            product_id: item.product?.id ?? '',
            variant_id: item.variant?.id ?? '',
            qty: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          invoice_number: order.invoice_number,
          subtotal: order.subtotal ?? 0,
          tax_amount: order.tax_amount ?? 0,
          total_amount: totalAmount,
          status: order.status,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errOrderMessage.ERR_GET_ORDER, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errOrderMessage.ERR_GET_ORDER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponse> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id },
        relations: [
          'items',
          'items.product',
          'items.variant',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!order) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER,
          HttpStatus.NOT_FOUND,
        );
      }

      if (!updateOrderDto.customer_id) {
        throw new HttpException(
          'Customer ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const customer = await this.customerRepository.findOne({
        where: { id: updateOrderDto.customer_id },
      });
      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      await this.orderRepository.update(id, {
        customer: { id: customer.id },
      });

      const updatedOrder = await this.orderRepository.findOne({
        where: { id },
        relations: [
          'items',
          'items.product',
          'items.variant',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!updatedOrder) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER,
          HttpStatus.NOT_FOUND,
        );
      }

      const totalAmount =
        (updatedOrder.subtotal ?? 0) +
        (updatedOrder.tax_amount ?? 0) -
        (updatedOrder.discount_amount ?? 0);

      return {
        message: successOrderMessage.SUCCESS_UPDATE_ORDER,
        data: {
          id: updatedOrder.id,
          customer_id: updatedOrder.customer?.id ?? '',
          branch_id: updatedOrder.branch?.id ?? '',
          user_id: updatedOrder.user?.id ?? '',
          items: (updatedOrder.items || []).map((item) => ({
            id: item.id,
            order_id: updatedOrder.id,
            product_id: item.product?.id ?? '',
            variant_id: item.variant?.id ?? '',
            qty: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          invoice_number: updatedOrder.invoice_number,
          subtotal: updatedOrder.subtotal ?? 0,
          tax_amount: updatedOrder.tax_amount ?? 0,
          total_amount: totalAmount,
          status: updatedOrder.status,
          created_at: updatedOrder.createdAt,
          updated_at: updatedOrder.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errOrderMessage.ERR_UPDATE_ORDER, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errOrderMessage.ERR_UPDATE_ORDER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateQuantity(
    orderId: string,
    orderItemId: string,
    quantity: number,
  ): Promise<OrderResponse> {
    try {
      if (!orderId || !orderItemId) {
        throw new HttpException(
          'Order ID and Order Item ID are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new HttpException(
          'Quantity must be at least 1',
          HttpStatus.BAD_REQUEST,
        );
      }

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: [
          'items',
          'items.product',
          'items.variant',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!order) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER,
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new HttpException(
          'Order status is not editable',
          HttpStatus.BAD_REQUEST,
        );
      }

      const orderItem = (order.items || []).find(
        (item) => item.id === orderItemId,
      );
      if (!orderItem) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER_ITEMS,
          HttpStatus.NOT_FOUND,
        );
      }

      orderItem.quantity = quantity;
      orderItem.subtotal = orderItem.quantity * orderItem.price;
      await this.orderItemRepository.save(orderItem);

      order.items = (order.items || []).map((item) =>
        item.id === orderItem.id ? orderItem : item,
      );
      order.subtotal = order.items.reduce(
        (total, item) => total + item.subtotal,
        0,
      );
      const savedOrder = await this.orderRepository.save(order);

      const totalAmount =
        (savedOrder.subtotal ?? 0) +
        (savedOrder.tax_amount ?? 0) -
        (savedOrder.discount_amount ?? 0);

      return {
        message: successOrderMessage.SUCCESS_UPDATE_ORDER,
        data: {
          id: savedOrder.id,
          customer_id: savedOrder.customer?.id ?? '',
          branch_id: savedOrder.branch?.id ?? '',
          user_id: savedOrder.user?.id ?? '',
          items: (savedOrder.items || []).map((item) => ({
            id: item.id,
            order_id: savedOrder.id,
            product_id: item.product?.id ?? '',
            variant_id: item.variant?.id ?? '',
            qty: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          invoice_number: savedOrder.invoice_number,
          subtotal: savedOrder.subtotal ?? 0,
          tax_amount: savedOrder.tax_amount ?? 0,
          total_amount: totalAmount,
          status: savedOrder.status,
          created_at: savedOrder.createdAt,
          updated_at: savedOrder.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errOrderMessage.ERR_UPDATE_ORDER_QUANTITY,
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errOrderMessage.ERR_UPDATE_ORDER_QUANTITY,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //delete order items
  async deleteOrderItems(
    orderId: string,
    orderItemId: string,
  ): Promise<OrderResponse> {
    try {
      if (!orderId || !orderItemId) {
        throw new HttpException(
          'Order ID and Order Item ID are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: [
          'items',
          'items.product',
          'items.variant',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!order) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER,
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new HttpException(
          'Order status is not editable',
          HttpStatus.BAD_REQUEST,
        );
      }

      const orderItem = (order.items || []).find(
        (item) => item.id === orderItemId,
      );
      if (!orderItem) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER_ITEMS,
          HttpStatus.NOT_FOUND,
        );
      }

      await this.orderItemRepository.delete(orderItem.id);

      const remainingItems = (order.items || []).filter(
        (item) => item.id !== orderItem.id,
      );
      order.items = remainingItems;
      order.subtotal = remainingItems.reduce(
        (total, item) => total + item.subtotal,
        0,
      );

      const savedOrder = await this.orderRepository.save(order);
      const totalAmount =
        (savedOrder.subtotal ?? 0) +
        (savedOrder.tax_amount ?? 0) -
        (savedOrder.discount_amount ?? 0);

      return {
        message: successOrderMessage.SUCCESS_DELETE_ORDER_ITEMS,
        data: {
          id: savedOrder.id,
          customer_id: savedOrder.customer?.id ?? '',
          branch_id: savedOrder.branch?.id ?? '',
          user_id: savedOrder.user?.id ?? '',
          items: (savedOrder.items || []).map((item) => ({
            id: item.id,
            order_id: savedOrder.id,
            product_id: item.product?.id ?? '',
            variant_id: item.variant?.id ?? '',
            qty: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          invoice_number: savedOrder.invoice_number,
          subtotal: savedOrder.subtotal ?? 0,
          tax_amount: savedOrder.tax_amount ?? 0,
          total_amount: totalAmount,
          status: savedOrder.status,
          created_at: savedOrder.createdAt,
          updated_at: savedOrder.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errOrderMessage.ERR_DELETE_ORDER_ITEMS, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errOrderMessage.ERR_DELETE_ORDER_ITEMS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  remove(id: string) {
    return `This action removes a #${id} order`;
  }
}
