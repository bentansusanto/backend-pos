import { HttpException, HttpStatus, Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Hashids from 'hashids';
import { errOrderMessage } from 'src/libs/errors/error_order';
import { successOrderMessage } from 'src/libs/success/success_order';
import { OrderResponse } from 'src/types/response/order.type';
import { In, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { PosSessionsService } from '../pos-sessions/pos-sessions.service';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Tax } from '../tax/entities/tax.entity';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';
import { UserLogsService } from '../user_logs/user_logs.service';
import { ReasonCategoriesService } from '../reason-categories/reason-categories.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { StockTake, StockTakeStatus } from '../stock-takes/entities/stock-take.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { EventsGateway } from '../events/events.gateway';
import { Payment, PaymentStatus, PaymentMethod } from '../payments/entities/payment.entity';
import { Refund } from '../payments/entities/refund.entity';
import { StockMovement, ReferenceType } from '../stock-movements/entities/stock-movement.entity';
import { ProductBatchesService } from '../product-batches/product-batches.service';
import { LoyaltySettingsService } from '../loyalty-settings/loyalty-settings.service';
import Stripe from 'stripe';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
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
    @InjectRepository(StockTake)
    private readonly stockTakeRepository: Repository<StockTake>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly userLogsService: UserLogsService,
    private readonly reasonCategoriesService: ReasonCategoriesService,
    private readonly posSessionsService: PosSessionsService,
    private readonly eventsGateway: EventsGateway,
    // Used for FEFO batch deduction after a sale is completed
    private readonly productBatchesService: ProductBatchesService,
    private readonly loyaltySettingsService: LoyaltySettingsService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
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

  private calculatePromotionDiscount(items: OrderItem[], subtotal: number, promotion: Promotion, customer?: Customer): number {
    if (!promotion || !promotion.rules || promotion.rules.length === 0) return 0;

    // For now, evaluate the first rule
    const rule = promotion.rules[0];
    let conditionMet = true;

    const hasConditionVariantTarget = rule.conditionVariants && rule.conditionVariants.length > 0;
    const hasConditionCategoryTarget = rule.conditionCategories && rule.conditionCategories.length > 0;

    // Filter items that count towards the condition
    const eligibleConditionItems = items?.filter(item => {
      const variantId = item.variant?.id || (item as any).variantId;
      const categoryId = item.variant?.product?.category?.id;

      if (!hasConditionVariantTarget && !hasConditionCategoryTarget) return true;

      const inVariantList = hasConditionVariantTarget && rule.conditionVariants.some(v => v.id === variantId);
      const inCategoryList = hasConditionCategoryTarget && rule.conditionCategories.some(c => c.id === categoryId);

      return inVariantList || inCategoryList;
    }) || [];

    const conditionSubtotal = eligibleConditionItems.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
    const totalQty = eligibleConditionItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    if (rule.conditionType === 'MIN_QTY') {
      if (totalQty < Number(rule.conditionValue?.minQty || 0)) conditionMet = false;
    } else if (rule.conditionType === 'MIN_SPEND') {
      if (conditionSubtotal < Number(rule.conditionValue?.minSpend || 0)) conditionMet = false;
    } else if (rule.conditionType === 'MIN_LOYALTY_POINTS') {
      const customerLoyalty = Number(customer?.loyalPoints || 0);
      if (customerLoyalty < Number(rule.conditionValue?.minLoyaltyPoints || 0)) conditionMet = false;
    } else if (rule.conditionType === 'ALWAYS_TRUE') {
      // If targets are specified, we should have at least one eligible item
      if ((hasConditionVariantTarget || hasConditionCategoryTarget) && eligibleConditionItems.length === 0) {
        conditionMet = false;
      }
    }

    if (!conditionMet) return 0;

    const hasActionVariantTarget = rule.actionVariants && rule.actionVariants.length > 0;
    const hasActionCategoryTarget = rule.actionCategories && rule.actionCategories.length > 0;

    // Filter items that receive the action (discount)
    const eligibleActionItems = items?.filter(item => {
      const variantId = item.variant?.id || (item as any).variantId;
      const categoryId = item.variant?.product?.category?.id;

      if (!hasActionVariantTarget && !hasActionCategoryTarget) return true;

      const inVariantList = hasActionVariantTarget && rule.actionVariants.some(v => v.id === variantId);
      const inCategoryList = hasActionCategoryTarget && rule.actionCategories.some(c => c.id === categoryId);

      return inVariantList || inCategoryList;
    }) || [];

    const actionSubtotal = eligibleActionItems.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);

    if (rule.actionType === 'PERCENT_DISCOUNT') {
      return actionSubtotal * (Number(rule.actionValue?.percentage || 0) / 100);
    } else if (rule.actionType === 'FIXED_DISCOUNT') {
      // If action targets are specified, only apply if we have eligible items
      if ((hasActionVariantTarget || hasActionCategoryTarget) && eligibleActionItems.length === 0) return 0;

      return Number(rule.actionValue?.amount || 0);
    } else if (rule.actionType === 'FIXED_PRICE') {
      if (eligibleActionItems.length === 0) return 0;
      const fixedPrice = Number(rule.actionValue?.amount || 0);
      return Math.max(0, actionSubtotal - fixedPrice);
    }

    return 0;
  }

  // create orders
  async create(
    createOrderDto: CreateOrderDto,
    currentUserId?: string,
  ): Promise<OrderResponse> {
    const { notes, order_id, branch_id, user_id, customer_id } =
      createOrderDto;

    // New: Check if branch is frozen for Stock Take
    if (branch_id) {
      const activeFrozenAudit = await this.stockTakeRepository.findOne({
        where: [
          {
            branch: { id: branch_id },
            status: StockTakeStatus.DRAFT,
            isFrozen: true,
          },
          {
            branch: { id: branch_id },
            status: StockTakeStatus.PENDING_APPROVAL,
            isFrozen: true,
          },
        ],
      });

      if (activeFrozenAudit) {
        throw new HttpException(
          'Cannot process transaction: Inventory is locked for audit (Stock Take in progress).',
          HttpStatus.CONFLICT,
        );
      }
    }

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
          relations: ['product', 'product.category'],
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
            'items.variant.product',
            'items.variant.product.category',
            'branch',
            'user',
            'customer',
            'promotion',
            'promotion.rules',
            'promotion.rules.conditionVariants',
            'promotion.rules.conditionCategories',
            'promotion.rules.actionVariants',
            'promotion.rules.actionCategories',
            'posSession',
          ],
        })
      : Promise.resolve(null);

    const [productStocks, existingOrderResult] = await Promise.all([
      productStocksPromise,
      existingOrderPromise,
    ]);

    const variantStockMap = new Map<string, number>();
    productStocks.forEach((stock) => {
      if (stock.productVariant?.id) {
        const current = variantStockMap.get(stock.productVariant.id) || 0;
        variantStockMap.set(stock.productVariant.id, current + stock.stock);
      }
    });

    // Step 4: Ensure stock is sufficient for each requested item (variant only)
    aggregatedItems.forEach((item) => {
      if (item.variantId) {
        const availableStock = variantStockMap.get(item.variantId);
        if (availableStock === undefined) {
          throw new HttpException(
            'Product variant stock not found',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (availableStock < item.quantity) {
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
            branch: { id: branch_id },
            user: { id: resolvedUserId },
            customer: customer_id ? { id: customer_id } : undefined,
            posSession: posSession ? { id: posSession.id } : undefined,
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
            relations: ['variant', 'variant.product', 'variant.product.category'],
          });
          savedNewItems.push(savedItem);
        }

        const savedItems = [...savedUpdatedItems, ...savedNewItems];
        const mergedItems = [...existingItems];
        savedItems.forEach((savedItem) => {
          // Re-attach variant relation if missing in savedItem
          const originalItem = [...itemsToUpdate, ...itemsToInsert].find(
            (item) => item.id === savedItem.id,
          );

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

        // Handle new promotion attachment if provided
        if (createOrderDto.promotion_id) {
          const promo = await this.promotionRepository.findOne({
            where: { id: createOrderDto.promotion_id },
            relations: [
              'rules',
              'rules.conditionVariants',
              'rules.conditionCategories',
              'rules.actionVariants',
              'rules.actionCategories',
            ],
          });
          if (promo) {
            existingOrder.promotion = promo;
          }
        }

        // Ensure customer is updated in the object for calculation if provided in the DTO
        if (createOrderDto.customer_id) {
          const customer = await manager.getRepository(Customer).findOne({
            where: { id: createOrderDto.customer_id },
          });
          if (customer) {
            existingOrder.customer = customer;
          }
        }

        let updatedDiscountAmount = existingOrder.discount_amount ?? 0;
        if (existingOrder.promotion && existingOrder.promotion.rules) {
          updatedDiscountAmount = this.calculatePromotionDiscount(mergedItems, subtotal, existingOrder.promotion, existingOrder.customer);
        }

        // Step 5b: Ensure session is linked if missing but active session exists
        let posSessionToLink = existingOrder.posSession;
        if (!posSessionToLink && resolvedUserId) {
          const sessionResponse =
            await this.posSessionsService.getActiveSession({
              id: resolvedUserId,
            } as any);
          if (sessionResponse && sessionResponse.data) {
            posSessionToLink = { id: sessionResponse.data.id } as any;
          }
        }

        // Only update specific fields on the order, avoiding the 'items' relation
        await orderRepo
          .createQueryBuilder()
          .update(Order)
          .set({
            notes: notes ?? existingOrder.notes,
            user: existingOrder.user ?? (resolvedUserId ? { id: resolvedUserId } : undefined),
            subtotal,
            tax_amount: subtotal * (await this.getActiveTaxRate()),
            discount_amount: updatedDiscountAmount,
            posSession: posSessionToLink ? { id: posSessionToLink.id } : undefined,
          } as any)
          .where('id = :id', { id: existingOrder.id })
          .execute();

        const savedOrder = await orderRepo.findOne({
          where: { id: existingOrder.id },
          relations: ['customer', 'branch', 'user', 'promotion'],
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
    this.userLogsService.log({
      userId: result.order.user?.id ?? resolvedUserId ?? '',
      branchId: result.order.branch?.id,
      action: ActionType.CREATE,
      entityType: EntityType.SALE,
      entityId: result.order.id,
      description: `Order created: ${result.order.invoice_number} (${result.items.length} items, total $${totalAmount})`,
      metadata: {
        invoice_number: result.order.invoice_number,
        total_amount: totalAmount,
        item_count: result.items.length,
      },
    });

    // Step 9: FEFO Batch Deduction
    // Fire-and-forget: deduct stock from earliest-expiry batches for each item sold.
    // We run this asynchronously so it doesn't block the order response.
    // If FEFO fails for any item, it logs a warning but does not fail the order.
    const branchId = result.order.branch?.id;
    if (branchId) {
      for (const item of result.items) {
        const variantId = item.variant?.id;
        if (variantId) {
          this.productBatchesService
            .deductStockFefo(branchId, variantId, item.quantity, result.order.id)
            .catch(err =>
              console.warn(`[FEFO] Deduction failed for variant ${variantId}: ${err.message}`),
            );
        }
      }
    }

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
        promotion_id: result.order.promotion?.id,
        promotion: result.order.promotion
          ? {
              id: result.order.promotion.id,
              name: result.order.promotion.name,
            }
          : undefined,
        total_amount: totalAmount,
        status: result.order.status,
        created_at: result.order.createdAt,
        updated_at: result.order.updatedAt,
      },
    };
  }

  async findAll(
    userId?: string,
    branchId?: string,
    status?: OrderStatus,
  ): Promise<OrderResponse> {
    const where: any = {};
    if (branchId) {
      where.branch = { id: branchId };
    } else if (userId) {
      where.user = { id: userId };
    }

    if (status) {
      where.status = status;
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
        'promotion',
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
          promotion_id: order.promotion?.id,
          promotion: order.promotion
            ? {
                id: order.promotion.id,
                name: order.promotion.name,
              }
            : undefined,
          total_amount: totalAmount,
          status: order.status,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        };
      }),
    };
  }

  async findOne(id: string): Promise<OrderResponse> {
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
        'promotion',
        'posSession',
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
        promotion_id: order.promotion?.id,
        promotion: order.promotion
          ? {
              id: order.promotion.id,
              name: order.promotion.name,
            }
          : undefined,
        total_amount: totalAmount,
        status: order.status,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      },
    };
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponse> {
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

    const updateData: any = {};
    if (updateOrderDto.customer_id) {
      const customer = await this.customerRepository.findOne({
        where: { id: updateOrderDto.customer_id },
      });
      if (customer) {
        updateData.customer = { id: customer.id };
        // Update the order object in memory so discount calculation uses the new customer
        order.customer = customer;
      }
    }

    if (updateOrderDto.promotion_id) {
      if (updateOrderDto.promotion_id === 'remove') {
        updateData.promotion = null;
        updateData.discount_amount = 0;
      } else {
        const promotion = await this.promotionRepository.findOne({
          where: { id: updateOrderDto.promotion_id },
          relations: [
            'rules',
            'rules.conditionVariants',
            'rules.conditionCategories',
            'rules.actionVariants',
            'rules.actionCategories',
          ],
        });
        if (promotion) {
          const discountAmount = this.calculatePromotionDiscount(order.items || [], order.subtotal, promotion, order.customer);
          updateData.promotion = { id: promotion.id };
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
        promotion_id: updatedOrder.promotion?.id,
        promotion: updatedOrder.promotion
          ? {
              id: updatedOrder.promotion.id,
              name: updatedOrder.promotion.name,
            }
          : undefined,
        total_amount: totalAmount,
        status: updatedOrder.status,
        created_at: updatedOrder.createdAt,
        updated_at: updatedOrder.updatedAt,
      },
    };
  }

  async updateQuantity(
    orderId: string,
    orderItemId: string,
    quantity: number,
  ): Promise<OrderResponse> {
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
        'items.variant.product.category',
        'customer',
        'branch',
        'user',
        'promotion',
        'promotion.rules',
        'promotion.rules.conditionVariants',
        'promotion.rules.conditionCategories',
        'promotion.rules.actionVariants',
        'promotion.rules.actionCategories',
        'posSession',
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

    if (order.promotion && order.promotion.rules) {
      order.discount_amount = this.calculatePromotionDiscount(order.items, order.subtotal, order.promotion, order.customer);
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
        total_amount: totalAmount,
        status: savedOrder.status,
        created_at: savedOrder.createdAt,
        updated_at: savedOrder.updatedAt,
      },
    };
  }

  //delete order items
  async deleteOrderItems(
    orderId: string,
    orderItemId: string,
  ): Promise<OrderResponse> {
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
        'items.variant.product.category',
        'customer',
        'branch',
        'user',
        'promotion',
        'promotion.rules',
        'promotion.rules.conditionVariants',
        'promotion.rules.conditionCategories',
        'promotion.rules.actionVariants',
        'promotion.rules.actionCategories',
        'posSession',
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
    const newSubtotal = remainingItems.reduce(
      (total, item) => total + item.subtotal,
      0,
    );
    const taxRate = await this.getActiveTaxRate();
    const newTaxAmount = newSubtotal * taxRate;

    let newDiscountAmount = order.discount_amount ?? 0;
    if (order.promotion && order.promotion.rules) {
      newDiscountAmount = this.calculatePromotionDiscount(remainingItems, newSubtotal, order.promotion, order.customer);
    }

    // Use QueryBuilder to update the order totals WITHOUT touching items relation (prevents cascade re-insert)
    await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({
        subtotal: newSubtotal,
        tax_amount: newTaxAmount,
        discount_amount: newDiscountAmount,
      } as any)
      .where('id = :id', { id: orderId })
      .execute();

    // Re-fetch the fresh order after update
    const refreshedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.variant', 'customer', 'branch', 'user', 'promotion'],
    });

    const totalAmount =
      (refreshedOrder.subtotal ?? 0) +
      (refreshedOrder.tax_amount ?? 0) -
      (refreshedOrder.discount_amount ?? 0);

    return {
      message: successOrderMessage.SUCCESS_DELETE_ORDER_ITEMS,
      data: {
        id: refreshedOrder.id,
        customer_id: refreshedOrder.customer?.id ?? '',
        branch_id: refreshedOrder.branch?.id ?? '',
        user_id: refreshedOrder.user?.id ?? '',
        items: (refreshedOrder.items || []).map((item) =>
          this.mapOrderItem(item, refreshedOrder.id),
        ),
        invoice_number: refreshedOrder.invoice_number,
        subtotal: refreshedOrder.subtotal ?? 0,
        tax_amount: refreshedOrder.tax_amount ?? 0,
        discount_amount: refreshedOrder.discount_amount ?? 0,
        total_amount: totalAmount,
        status: refreshedOrder.status,
        created_at: refreshedOrder.createdAt,
        updated_at: refreshedOrder.updatedAt,
      },
    };
  }

  async remove(id: string): Promise<void> {
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
  }

  async refundOrder(id: string, reason: string, currentUserId: string, reasonCategoryId?: string): Promise<OrderResponse> {
    // --- Validation: Reason Category ---
    if (reasonCategoryId) {
      const category = await this.reasonCategoriesService.findOne(reasonCategoryId);
      if (reason.length < category.min_description_length) {
        throw new HttpException(
          `Reason details are too short. The '${category.label}' category requires at least ${category.min_description_length} characters of explanation.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.variant',
        'items.variant.product',
        'customer',
        'branch',
        'user',
        'promotion',
        'promotion.rules'
      ],
    });

    if (!order) {
      throw new HttpException(
        errOrderMessage.ERR_GET_ORDER,
        HttpStatus.NOT_FOUND,
      );
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new HttpException(
        'Only completed orders can be refunded',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { refundedOrder, paymentMethod, stripeRefundId } = await this.orderRepository.manager.transaction(async (manager) => {
      // 1. Mark order as refunded
      order.status = OrderStatus.REFUNDED;
      order.notes = order.notes ? `${order.notes}\nRefund Reason: ${reason}` : `Refund Reason: ${reason}`;
      const savedOrder = await manager.save(order);

      // 2. Process Payment Refund
      const paymentRepo = manager.getRepository(Payment);
      const payment = await paymentRepo.findOne({
        where: { orderId: order.id, status: PaymentStatus.SUCCESS }
      });
      
      let paymentMethod = 'unknown';
      let stripeRefundId = undefined;

      if (payment) {
        paymentMethod = payment.method;
        payment.status = PaymentStatus.REFUNDED;
        await manager.save(payment);

        // Create structured Refund record
        const refundRepo = manager.getRepository(Refund);
        const refund = refundRepo.create({
          order: { id: order.id },
          payment: { id: payment.id },
          amount: Number(payment.amount || 0),
          reason: reason,
          reasonCategoryId: reasonCategoryId,
          refundedBy: { id: currentUserId },
        });
        
        if (payment.method === PaymentMethod.STRIPE && payment.externalId) {
          // Trigger Stripe refund. This will throw if it fails, rolling back the transaction.
          stripeRefundId = await this.paymentsService.processStripeRefund(payment, reason);
          refund.stripeRefundId = stripeRefundId;
        }

        await manager.save(refund);
      }

      // 3. Return Stock & Create Movements
      const stockRepo = manager.getRepository(ProductStock);
      const movementRepo = manager.getRepository(StockMovement);
      const branchId = order.branch?.id;

      for (const item of order.items || []) {
        if (!item.variant?.id) continue;
        const qty = Number(item.quantity || 0);
        if (qty <= 0) continue;

        // General stock update
        const productStocks = await stockRepo.find({
          where: { productVariant: { id: item.variant.id }, ...(branchId ? { branch: { id: branchId } } : {}) },
          relations: ['productVariant', 'branch']
        });
        
        let targetStock = productStocks.length > 0 ? productStocks[0] : null;
        if (targetStock) {
          targetStock.stock += qty;
          targetStock.updatedAt = new Date();
          await manager.save(targetStock);
        }

        // Log specific batch reversals (Atomic)
        let restoredToBatches = 0;
        if (branchId) {
          restoredToBatches = await this.productBatchesService.restoreStockFefo(
            branchId,
            item.variant.id,
            qty,
            order.id,
            `Refund: ${reason}`,
            manager,
          );
        }

        // Fallback Movement: record general movement for any quantity not matched to a batch
        const remainingToMove = qty - restoredToBatches;
        if (remainingToMove > 0) {
          const movement = movementRepo.create({
            productVariant: { id: item.variant.id },
            branch: branchId ? { id: branchId } : undefined,
            referenceType: ReferenceType.RETURN_SALE,
            qty: remainingToMove,
            referenceId: order.id,
            reason: `Refund (General): ${reason}`,
          });
          await manager.save(movement);
        }
        
        this.eventsGateway.broadcastStockUpdate({
          variantId: item.variant.id,
          branchId: targetStock?.branch?.id ?? branchId ?? '',
          newStock: targetStock ? targetStock.stock : 0,
        });
      }

      // 4. Adjust Loyalty Points
      if (order.customer && payment) {
        // award points deduction (reverse points earned)
        const loyaltySettings = await this.loyaltySettingsService.getSettings(order.branch?.id);
        let pointsToDeduct = 0;

        if (loyaltySettings && loyaltySettings.isActive) {
          const subtotal = Number(order.subtotal || 0);
          if (subtotal >= Number(loyaltySettings.minimumSpend)) {
            pointsToDeduct = Math.floor(subtotal / Number(loyaltySettings.amountPerPoint)) * Number(loyaltySettings.pointsEarned);
          }
        }
        let pointsToReturn = 0;
        
        if (order.promotion && order.promotion.rules) {
          const loyaltyRule = order.promotion.rules.find((r: any) => r.conditionType === 'MIN_LOYALTY_POINTS');
          if (loyaltyRule && loyaltyRule.conditionValue?.minLoyaltyPoints) {
            pointsToReturn = Number(loyaltyRule.conditionValue.minLoyaltyPoints);
          }
        }

        order.customer.loyalPoints = Math.max(0, (Number(order.customer.loyalPoints) || 0) - pointsToDeduct + pointsToReturn);
        await manager.save(order.customer);
        
        this.eventsGateway.broadcastLoyaltyUpdate({
          customerId: order.customer.id,
          newPoints: order.customer.loyalPoints,
        });
      }

      return { refundedOrder: savedOrder, paymentMethod, stripeRefundId };
    });

    this.userLogsService.log({
      userId: currentUserId,
      action: ActionType.REFUND,
      entityType: EntityType.SALE,
      entityId: order.id,
      description: `Order ${order.invoice_number} refunded by Admin ${currentUserId}: ${reason}`,
    });

    return {
      message: 'Order refunded successfully',
      data: {
        id: refundedOrder.id,
        invoice_number: refundedOrder.invoice_number,
        status: refundedOrder.status,
        refund: {
          id: refundedOrder.id,
          amount: refundedOrder.subtotal + refundedOrder.tax_amount - refundedOrder.discount_amount,
          reason: reason,
          refundedAt: new Date(),
          paymentMethod,
          stripeRefundId,
          cashierName: (refundedOrder.user as any)?.name || 'System'
        }
      } as any
    };
  }
}

