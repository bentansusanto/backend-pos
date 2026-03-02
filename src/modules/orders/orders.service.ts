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

  private mapOrderItem(item: OrderItem, orderId: string) {
    const variantId = item.variant?.id ?? '';
    // Priority: Variant Thumbnail -> Product Thumbnail (fallback) -> First Product Image (fallback)
    const variantImage =
      item.variant?.thumbnail ?? item.variant?.product?.thumbnail ?? '';
    const productImage =
      item.product?.thumbnail ?? item.product?.images?.[0] ?? '';

    return {
      id: item.id,
      order_id: orderId,
      product_id: variantId ? '' : (item.product?.id ?? ''),
      variant_id: variantId,
      product_name:
        item.product?.name_product ?? item.variant?.product?.name_product ?? '',
      variant_name: item.variant?.name_variant ?? '',
      image: variantId ? variantImage : productImage,
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
      const variantStocksByProductPromise = productIds.length
        ? this.productStockRepository.find({
            where: [
              {
                productVariant: { product: { id: In(productIds) } },
                ...(branch_id ? { branch: { id: branch_id } } : {}),
              },
            ],
            relations: ['productVariant', 'productVariant.product', 'branch'],
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

      const [productStocks, variantStocksByProduct, existingOrderResult] =
        await Promise.all([
          productStocksPromise,
          variantStocksByProductPromise,
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
      const variantStockTotalsByProduct = new Map<string, number>();
      variantStocksByProduct.forEach((stock) => {
        const productId = stock.productVariant?.product?.id;
        if (!productId) return;
        const current = variantStockTotalsByProduct.get(productId) || 0;
        variantStockTotalsByProduct.set(
          productId,
          current + (stock.stock || 0),
        );
      });

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
            const variantTotal = variantStockTotalsByProduct.get(
              item.productId,
            );
            if (!variantTotal) {
              throw new HttpException(
                'Product stock not found',
                HttpStatus.BAD_REQUEST,
              );
            }
            if (variantTotal < item.quantity) {
              throw new HttpException(
                'Product stock is insufficient',
                HttpStatus.BAD_REQUEST,
              );
            }
            return;
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
              user: resolvedUserId ? { id: resolvedUserId } : undefined,
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
                  order: { id: savedOrder.id } as Order,
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
            savedOrder.tax_amount = subtotal * 0.05;
            savedOrder.discount_amount = savedOrder.discount_amount ?? 0;
            const finalOrder = await orderRepo.save(savedOrder);

            return { order: finalOrder, items: newItems };
          }

          const existingItems = await orderItemRepo.find({
            where: { order: { id: existingOrder.id } },
            relations: ['product', 'variant', 'variant.product'],
          });
          const existingItemsMap = new Map<string, OrderItem>();
          existingItems.forEach((item) => {
            const key = item.variant?.id
              ? `variant:${item.variant.id}`
              : item.product?.id
                ? `product:${item.product.id}`
                : '';
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
            const product = item.productId
              ? productMap.get(item.productId)
              : variant?.product;

            const createdItem = orderItemRepo.create({
              order: existingOrder, // Force ID for new items
              product,
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
              product: newItem.product ? { id: newItem.product.id } : null,
              variant: newItem.variant ? { id: newItem.variant.id } : null,
              quantity: newItem.quantity,
              price: newItem.price,
              subtotal: newItem.subtotal,
            });

            const savedItem = await orderItemRepo.findOne({
              where: { id: newId },
              relations: ['product', 'variant', 'variant.product'],
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

            // Re-attach relations if missing in savedItem
            if (originalItem) {
              if (!savedItem.product && originalItem.product) {
                savedItem.product = originalItem.product;
              }
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

          // Recalculate order subtotal after update/insert
          const subtotal = mergedItems.reduce(
            (total, item) => total + item.subtotal,
            0,
          );
          // Only update specific fields on the order, avoiding the 'items' relation
          // This prevents TypeORM from trying to cascade save items again
          await orderRepo.update(existingOrder.id, {
            notes: notes ?? existingOrder.notes,
            user:
              existingOrder.user ??
              (resolvedUserId ? { id: resolvedUserId } : undefined),
            subtotal,
            tax_amount: subtotal * 0.05,
          });

          const savedOrder = await orderRepo.findOne({
            where: { id: existingOrder.id },
            relations: ['customer', 'branch', 'user'],
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
          'items.product',
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
      order.tax_amount = order.subtotal * 0.05;
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
      order.tax_amount = order.subtotal * 0.05;

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
