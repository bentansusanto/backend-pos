import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Hashids from 'hashids';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errOrderMessage } from 'src/libs/errors/error_order';
import { successOrderMessage } from 'src/libs/success/success_order';
import { OrderResponse } from 'src/types/response/order.type';
import { In, Repository } from 'typeorm';
import { Logger } from 'winston';
import { Customer } from '../customers/entities/customer.entity';
import { Discount } from '../discounts/entities/discount.entity';
import { PosSessionsService } from '../pos-sessions/pos-sessions.service';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Tax } from '../tax/entities/tax.entity';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';
import { UserLogsService } from '../user_logs/user_logs.service';
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
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
    private readonly userLogsService: UserLogsService,
    private readonly posSessionsService: PosSessionsService,
  ) {}

  private async getActiveTaxRate(): Promise<number> {
    const activeTax = await this.taxRepository.findOne({
      where: { is_active: true },
    });
    return activeTax && activeTax.rate ? Number(activeTax.rate) / 100 : 0.05;
  }

  private mapOrderItem(item: OrderItem, orderId: string) {
    const variantId = item.variant?.id ?? '';
    // Use variant thumbnail, fallback to variant's product thumbnail
    const image =
      item.variant?.thumbnail ?? item.variant?.product?.thumbnail ?? '';

    return {
      id: item.id,
      order_id: orderId,
      variant_id: variantId,
      product_name: item.variant?.product?.name_product ?? '',
      variant_name: item.variant?.name_variant ?? '',
      image,
      qty: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    };
  }

  // create orders
  async create(
    createOrderDto: CreateOrderDto,
    currentUserId?: string,
  ): Promise<OrderResponse> {
    try {
      const { notes, order_id, branch_id, user_id, customer_id } =
        createOrderDto;
      const items = createOrderDto.items || [];
      const resolvedUserId = user_id || currentUserId;
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
        // Validate quantity
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new HttpException(
            'Quantity must be greater than 0',
            HttpStatus.BAD_REQUEST,
          );
        }
        const variantId = item.variantId?.trim() || '';
        if (!variantId) {
          throw new HttpException(
            'Variant ID is required',
            HttpStatus.BAD_REQUEST,
          );
        }
        // Merge same variant so quantity is accumulated
        const key = `variant:${variantId}`;
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
            variantId,
          });
        }
      });

      const variantIds = Array.from(aggregatedItems.values())
        .map((item) => item.variantId)
        .filter((id): id is string => Boolean(id));

      // Step 2: Validate variant references against database
      const variants = variantIds.length
        ? await this.productVariantRepository.find({
            where: { id: In(variantIds) },
            relations: ['product'],
          })
        : [];

      if (variants.length !== variantIds.length) {
        throw new HttpException(
          'Product variant not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const variantMap = new Map(
        variants.map((variant) => [variant.id, variant]),
      );

      // Step 3: Check variant stock in product_stocks, filter by branch if provided
      const stockWhere = [];
      if (variantIds.length) {
        stockWhere.push({
          productVariant: { id: In(variantIds) },
          ...(branch_id ? { branch: { id: branch_id } } : {}),
        });
      }
      const productStocksPromise = stockWhere.length
        ? this.productStockRepository.find({
            where: stockWhere,
            relations: ['productVariant', 'branch'],
          })
        : Promise.resolve([]);

      const existingOrderPromise = order_id
        ? this.orderRepository.findOne({
            where: { id: order_id },
            relations: [
              'items',
              'items.variant',
              'branch',
              'user',
              'customer',
              'discount',
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

      // Step 4: Ensure stock is sufficient for each requested item (variant only)
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
            let posSession = null;
            if (resolvedUserId) {
              const sessionResponse =
                await this.posSessionsService.getActiveSession({
                  id: resolvedUserId,
                } as any);
              if (sessionResponse && sessionResponse.data) {
                posSession = { id: sessionResponse.data.id };
              }
            }

            const createdOrder = orderRepo.create({
              invoice_number: `INV-${Date.now()}`,
              notes,
              status: OrderStatus.PENDING,
              branch: branch_id ? { id: branch_id } : undefined,
              user: resolvedUserId ? { id: resolvedUserId } : undefined,
              customer: customer_id ? { id: customer_id } : undefined,
              posSession,
            });
            const savedOrder = await orderRepo.save(createdOrder);

            // Add new order items based on payload
            const newItems = Array.from(aggregatedItems.values()).map(
              (item) => {
                const variant = item.variantId
                  ? variantMap.get(item.variantId)
                  : undefined;
                const subtotal = item.quantity * item.price;
                return orderItemRepo.create({
                  order: { id: savedOrder.id } as Order,
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
            const taxRate = await this.getActiveTaxRate();
            savedOrder.subtotal = subtotal;
            savedOrder.tax_amount = subtotal * taxRate;
            savedOrder.discount_amount = savedOrder.discount_amount ?? 0;
            const finalOrder = await orderRepo.save(savedOrder);

            return { order: finalOrder, items: newItems };
          }

          const existingItems = await orderItemRepo.find({
            where: { order: { id: existingOrder.id } },
            relations: ['variant', 'variant.product'],
          });
          const existingItemsMap = new Map<string, OrderItem>();
          existingItems.forEach((item) => {
            const key = item.variant?.id ? `variant:${item.variant.id}` : '';
            if (key) {
              existingItemsMap.set(key, item);
            }
          });

          // Separate existing items (to update) and new items (to insert)
          const itemsToUpdate: OrderItem[] = [];
          const itemsToInsert: OrderItem[] = [];

          aggregatedItems.forEach((item) => {
            const key = item.variantId
              ? `variant:${item.variantId}`
              : item.productId
                ? `product:${item.productId}`
                : '';
            if (!key) {
              return;
            }
            const existingItem = existingItemsMap.get(key);
            if (existingItem) {
              existingItem.quantity = existingItem.quantity + item.quantity;
              existingItem.price = item.price;
              existingItem.subtotal =
                existingItem.quantity * existingItem.price;
              existingItem.order = { id: existingOrder.id } as Order; // Keep explicit reference for update
              itemsToUpdate.push(existingItem);
              return;
            }
            const variant = item.variantId
              ? variantMap.get(item.variantId)
              : undefined;

            const createdItem = orderItemRepo.create({
              order: existingOrder,
              variant,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            });
            itemsToInsert.push(createdItem);
          });

          // 1. Update existing items
          const savedUpdatedItems = await orderItemRepo.save(itemsToUpdate);

          // 2. Insert new items manually to guarantee order_id
          const savedNewItems: OrderItem[] = [];
          for (const newItem of itemsToInsert) {
            // Generate id manually karena BeforeInsert mungkin tidak trigger saat insert raw
            const newId = new Hashids(process.env.ID_SECRET, 10).encode(
              Date.now(),
            );

            await orderItemRepo.insert({
              id: newId,
              order: { id: existingOrder.id },
              variant: newItem.variant ? { id: newItem.variant.id } : null,
              quantity: newItem.quantity,
              price: newItem.price,
              subtotal: newItem.subtotal,
            });

            const savedItem = await orderItemRepo.findOne({
              where: { id: newId },
              relations: ['variant', 'variant.product'],
            });
            savedNewItems.push(savedItem);
          }

          const savedItems = [...savedUpdatedItems, ...savedNewItems];
          const mergedItems = [...existingItems];
          savedItems.forEach((savedItem) => {
            // Find corresponding item in itemsToSave to preserve relations
            const originalItem = [...itemsToUpdate, ...itemsToInsert].find(
              (item) => item.id === savedItem.id,
            );

            // Re-attach variant relation if missing in savedItem
            if (originalItem) {
              if (!savedItem.variant && originalItem.variant) {
                savedItem.variant = originalItem.variant;
              }
            }

            const index = mergedItems.findIndex(
              (item) => item.id === savedItem.id,
            );
            if (index >= 0) {
              mergedItems[index] = savedItem;
            } else {
              mergedItems.push(savedItem);
            }
          });

          const subtotal = mergedItems.reduce(
            (total, item) => total + item.subtotal,
            0,
          );

          let updatedDiscountAmount = existingOrder.discount_amount ?? 0;
          if (existingOrder.discount) {
            if (existingOrder.discount.type === 'percentage') {
              updatedDiscountAmount =
                subtotal * (Number(existingOrder.discount.value) / 100);
            } else {
              updatedDiscountAmount = Number(existingOrder.discount.value);
            }
          }

          // Only update specific fields on the order, avoiding the 'items' relation
          // This prevents TypeORM from trying to cascade save items again
          await orderRepo.update(existingOrder.id, {
            notes: notes ?? existingOrder.notes,
            user:
              existingOrder.user ??
              (resolvedUserId ? { id: resolvedUserId } : undefined),
            subtotal,
            tax_amount: subtotal * (await this.getActiveTaxRate()),
            discount_amount: updatedDiscountAmount,
          });

          const savedOrder = await orderRepo.findOne({
            where: { id: existingOrder.id },
            relations: ['customer', 'branch', 'user', 'discount'],
          });

          return { order: savedOrder, items: mergedItems };
        },
      );

      // Step 7: Compute total_amount from subtotal + tax - discount
      const totalAmount =
        (result.order.subtotal ?? 0) +
        (result.order.tax_amount ?? 0) -
        (result.order.discount_amount ?? 0);

      // Step 8: Map entities to response contract
      // Fire-and-forget activity log (non-blocking)
      this.userLogsService.log({
        userId: result.order.user?.id ?? resolvedUserId ?? '',
        branchId: result.order.branch?.id,
        action: ActionType.CREATE,
        entityType: EntityType.SALE,
        entityId: result.order.id,
        description: `Order created: ${result.order.invoice_number} (${result.items.length} items, total Rp${totalAmount})`,
        metadata: {
          invoice_number: result.order.invoice_number,
          total_amount: totalAmount,
          item_count: result.items.length,
        },
      });
      return {
        message: successOrderMessage.SUCCESS_CREATE_ORDER,
        data: {
          id: result.order.id,
          customer_id: result.order.customer?.id ?? '',
          branch_id: result.order.branch?.id ?? '',
          user_id: result.order.user?.id ?? '',
          items: result.items.map((item) =>
            this.mapOrderItem(item, result.order.id),
          ),
          invoice_number: result.order.invoice_number,
          subtotal: result.order.subtotal ?? 0,
          tax_amount: result.order.tax_amount ?? 0,
          discount_amount: result.order.discount_amount ?? 0,
          discount_id: result.order.discount?.id,
          discount: result.order.discount
            ? {
                id: result.order.discount.id,
                name: result.order.discount.name,
                type: result.order.discount.type,
                value: Number(result.order.discount.value),
              }
            : undefined,
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
        {
          Error: {
            field: 'general',
            body: error.message || errOrderMessage.ERR_CREATE_ORDER,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(userId?: string, branchId?: string): Promise<OrderResponse> {
    try {
      const where: any = {};
      if (branchId) {
        where.branch = { id: branchId };
      } else if (userId) {
        where.user = { id: userId };
      }

      const orders = await this.orderRepository.find({
        where,
        relations: [
          'items',
          'items.variant',
          'items.variant.product',
          'items.variant.product.category',
          'customer',
          'branch',
          'user',
        ],
      });
      if (!orders || orders.length === 0) {
        return {
          message: successOrderMessage.SUCCESS_GET_ORDERS,
          datas: [],
        };
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
            items: (order.items || []).map((item) =>
              this.mapOrderItem(item, order.id),
            ),
            invoice_number: order.invoice_number,
            subtotal: order.subtotal ?? 0,
            tax_amount: order.tax_amount ?? 0,
            discount_amount: order.discount_amount ?? 0,
            discount_id: order.discount?.id,
            discount: order.discount
              ? {
                  id: order.discount.id,
                  name: order.discount.name,
                  type: order.discount.type,
                  value: Number(order.discount.value),
                }
              : undefined,
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
          'items.variant',
          'items.variant.product',
          'items.variant.product.category',
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
          items: (order.items || []).map((item) =>
            this.mapOrderItem(item, order.id),
          ),
          invoice_number: order.invoice_number,
          subtotal: order.subtotal ?? 0,
          tax_amount: order.tax_amount ?? 0,
          discount_amount: order.discount_amount ?? 0,
          discount_id: order.discount?.id,
          discount: order.discount
            ? {
                id: order.discount.id,
                name: order.discount.name,
                type: order.discount.type,
                value: Number(order.discount.value),
              }
            : undefined,
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
          'items.variant',
          'items.variant.product',
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

      const updateData: any = {};

      if (updateOrderDto.customer_id) {
        const customer = await this.customerRepository.findOne({
          where: { id: updateOrderDto.customer_id },
        });
        if (customer) {
          updateData.customer = { id: customer.id };
        }
      }

      if (updateOrderDto.discount_id) {
        if (updateOrderDto.discount_id === 'remove') {
          updateData.discount = null;
          updateData.discount_amount = 0;
        } else {
          const discount = await this.discountRepository.findOne({
            where: { id: updateOrderDto.discount_id },
          });
          if (discount) {
            let discountAmount = 0;
            if (discount.type === 'percentage') {
              discountAmount = order.subtotal * (Number(discount.value) / 100);
            } else {
              discountAmount = Number(discount.value);
            }
            updateData.discount = { id: discount.id };
            updateData.discount_amount = discountAmount;
          }
        }
      }

      await this.orderRepository.update(id, updateData);

      const updatedOrder = await this.orderRepository.findOne({
        where: { id },
        relations: [
          'items',
          'items.variant',
          'items.variant.product',
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
          items: (updatedOrder.items || []).map((item) =>
            this.mapOrderItem(item, updatedOrder.id),
          ),
          invoice_number: updatedOrder.invoice_number,
          subtotal: updatedOrder.subtotal ?? 0,
          tax_amount: updatedOrder.tax_amount ?? 0,
          discount_amount: updatedOrder.discount_amount ?? 0,
          discount_id: updatedOrder.discount?.id,
          discount: updatedOrder.discount
            ? {
                id: updatedOrder.discount.id,
                name: updatedOrder.discount.name,
                type: updatedOrder.discount.type,
                value: Number(updatedOrder.discount.value),
              }
            : undefined,
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
          'items.variant',
          'items.variant.product',
          'customer',
          'branch',
          'user',
          'discount',
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
      const taxRate = await this.getActiveTaxRate();
      order.tax_amount = order.subtotal * taxRate;

      if (order.discount) {
        if (order.discount.type === 'percentage') {
          order.discount_amount =
            order.subtotal * (Number(order.discount.value) / 100);
        } else {
          order.discount_amount = Number(order.discount.value);
        }
      }

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
          items: (savedOrder.items || []).map((item) =>
            this.mapOrderItem(item, savedOrder.id),
          ),
          invoice_number: savedOrder.invoice_number,
          subtotal: savedOrder.subtotal ?? 0,
          tax_amount: savedOrder.tax_amount ?? 0,
          discount_amount: savedOrder.discount_amount ?? 0,
          discount_id: savedOrder.discount?.id,
          discount: savedOrder.discount
            ? {
                id: savedOrder.discount.id,
                name: savedOrder.discount.name,
                type: savedOrder.discount.type,
                value: Number(savedOrder.discount.value),
              }
            : undefined,
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
          'items.variant',
          'items.variant.product',
          'customer',
          'branch',
          'user',
          'discount',
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
      const taxRate = await this.getActiveTaxRate();
      order.tax_amount = order.subtotal * taxRate;

      if (order.discount) {
        if (order.discount.type === 'percentage') {
          order.discount_amount =
            order.subtotal * (Number(order.discount.value) / 100);
        } else {
          order.discount_amount = Number(order.discount.value);
        }
      }

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
          items: (savedOrder.items || []).map((item) =>
            this.mapOrderItem(item, savedOrder.id),
          ),
          invoice_number: savedOrder.invoice_number,
          subtotal: savedOrder.subtotal ?? 0,
          tax_amount: savedOrder.tax_amount ?? 0,
          discount_amount: savedOrder.discount_amount ?? 0,
          discount_id: savedOrder.discount?.id,
          discount: savedOrder.discount
            ? {
                id: savedOrder.discount.id,
                name: savedOrder.discount.name,
                type: savedOrder.discount.type,
                value: Number(savedOrder.discount.value),
              }
            : undefined,
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

  async remove(id: string): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({ where: { id } });
      if (!order) {
        throw new HttpException(
          errOrderMessage.ERR_GET_ORDER,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.orderRepository.delete(id);
      // Fire-and-forget log
      this.userLogsService.log({
        userId: '',
        action: ActionType.DELETE,
        entityType: EntityType.SALE,
        entityId: id,
        description: `Order ${id} deleted`,
      });
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
}
