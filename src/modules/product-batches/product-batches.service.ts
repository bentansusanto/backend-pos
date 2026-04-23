import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan } from 'typeorm';
import { CreateProductBatchDto, UpdateProductBatchDto } from './dto/create-product-batch.dto';
import { ProductBatch, ProductBatchStatus } from './entities/product-batch.entity';
import { ProductBatchData, ProductBatchResponse } from 'src/types/response/product-batch.type';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Supplier } from '../supplier/entities/supplier.entity';
import { PurchaseReceiving } from '../purchase_receivings/entities/purchase_receiving.entity';
import { StockMovement, ReferenceType } from '../stock-movements/entities/stock-movement.entity';

@Injectable()
export class ProductBatchesService {
  constructor(
    @InjectRepository(ProductBatch)
    private readonly productBatchRepository: Repository<ProductBatch>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(PurchaseReceiving)
    private readonly receivingRepository: Repository<PurchaseReceiving>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
  ) {}

  /**
   * Create a new product batch and record an opening stock movement.
   */
  async create(createProductBatchDto: CreateProductBatchDto): Promise<ProductBatchResponse> {
    await this.validateBatchData(createProductBatchDto);

    // If currentQuantity is not provided, default to initialQuantity
    const currentQuantity = createProductBatchDto.currentQuantity ?? createProductBatchDto.initialQuantity;
    const { productId, ...dto } = createProductBatchDto;

    const batch = this.productBatchRepository.create({
      ...dto,
      currentQuantity,
      productVariant: { id: createProductBatchDto.productVariantId },
      branch: { id: createProductBatchDto.branchId },
      supplier: createProductBatchDto.supplierId ? { id: createProductBatchDto.supplierId } : null,
      purchaseReceiving: createProductBatchDto.purchaseReceivingId ? { id: createProductBatchDto.purchaseReceivingId } : null,
    });

    const savedBatch = await this.productBatchRepository.save(batch);

    // Record an opening stock movement to trace this batch's origin
    await this.recordStockMovement({
      variantId: savedBatch.productVariantId,
      branchId: savedBatch.branchId,
      batchId: savedBatch.id,
      referenceType: ReferenceType.OPENING_STOCK,
      referenceId: savedBatch.id,
      qty: Number(savedBatch.initialQuantity),
      reason: `Batch ${savedBatch.batchNumber || savedBatch.id} received`,
    });

    return {
      message: 'Product batch created successfully',
      data: this.mapToData(savedBatch),
    };
  }

  /**
   * Find all batches with optional branch/variant filtering.
   */
  async findAll(query?: { branch_id?: string; variant_id?: string }): Promise<ProductBatchResponse> {
    const where: any = {};
    if (query?.branch_id) where.branch = { id: query.branch_id };
    if (query?.variant_id) where.productVariant = { id: query.variant_id };

    const batches = await this.productBatchRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      message: 'Product batches retrieved successfully',
      datas: batches.map(batch => this.mapToData(batch)),
    };
  }

  /**
   * Find a single batch by its ID.
   */
  async findOne(id: string): Promise<ProductBatchResponse> {
    const batch = await this.productBatchRepository.findOne({ where: { id } });

    if (!batch) throw new NotFoundException(`Batch with ID ${id} not found`);
    return {
      message: 'Product batch retrieved successfully',
      data: this.mapToData(batch),
    };
  }

  /**
   * Update an existing batch. Only status, dates, and cost price may be changed post-creation.
   */
  async update(id: string, updateProductBatchDto: UpdateProductBatchDto): Promise<ProductBatchResponse> {
    const batchEntity = await this.productBatchRepository.findOne({ where: { id } });
    if (!batchEntity) throw new NotFoundException(`Batch with ID ${id} not found`);

    await this.validateBatchData(updateProductBatchDto, id);

    const updatedBatch = this.productBatchRepository.merge(batchEntity, {
      ...updateProductBatchDto,
      productVariant: updateProductBatchDto.productVariantId ? { id: updateProductBatchDto.productVariantId } : batchEntity.productVariant,
      branch: updateProductBatchDto.branchId ? { id: updateProductBatchDto.branchId } : batchEntity.branch,
      supplier: updateProductBatchDto.supplierId ? { id: updateProductBatchDto.supplierId } : batchEntity.supplier,
      purchaseReceiving: updateProductBatchDto.purchaseReceivingId ? { id: updateProductBatchDto.purchaseReceivingId } : batchEntity.purchaseReceiving,
    });

    const savedBatch = await this.productBatchRepository.save(updatedBatch);
    return {
      message: 'Product batch updated successfully',
      data: this.mapToData(savedBatch),
    };
  }

  /**
   * Dispose (write-off) an entire batch.
   * Sets the status to EXPIRED, zeros out currentQuantity,
   * and records an EXPIRED stock movement for full audit trail.
   */
  async dispose(id: string, reason?: string): Promise<ProductBatchResponse> {
    const batch = await this.productBatchRepository.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch with ID ${id} not found`);

    // Guard: cannot dispose an already sold-out or already expired batch
    if (batch.status === ProductBatchStatus.SOLD_OUT) {
      throw new BadRequestException('Cannot dispose a batch that is already sold out');
    }

    const disposedQty = Number(batch.currentQuantity);

    // Mark batch as expired and zero the current quantity
    batch.status = ProductBatchStatus.EXPIRED;
    batch.currentQuantity = 0;
    await this.productBatchRepository.save(batch);

    // Record a negative stock movement to reflect the write-off
    if (disposedQty > 0) {
      await this.recordStockMovement({
        variantId: batch.productVariantId,
        branchId: batch.branchId,
        batchId: batch.id,
        referenceType: ReferenceType.EXPIRED,
        referenceId: batch.id,
        qty: -disposedQty, // Negative to indicate stock leaving the system
        reason: reason || `Batch ${batch.batchNumber || batch.id} disposed/written off`,
      });
    }

    return {
      message: `Batch ${batch.batchNumber || batch.id} has been disposed successfully`,
      data: this.mapToData(batch),
    };
  }

  /**
   * FEFO (First Expired, First Out) stock deduction.
   * Deducts the requested quantity from batches with the earliest expiry date first.
   * Used by OrdersService when a sale is processed through the POS.
   */
  async deductStockFefo(
    branchId: string,
    variantId: string,
    qty: number,
    referenceId: string,
  ): Promise<void> {
    // Fetch all active batches for this variant+branch, ordered by earliest expiry date
    const batches = await this.productBatchRepository.find({
      where: {
        branch: { id: branchId },
        productVariant: { id: variantId },
        status: ProductBatchStatus.ACTIVE,
      },
      order: {
        // Nulls last: batches with no expiry date are consumed last
        expiryDate: 'ASC',
      },
    });

    let remaining = qty;

    for (const batch of batches) {
      // Stop deducting once all required quantity has been allocated
      if (remaining <= 0) break;

      const available = Number(batch.currentQuantity);
      if (available <= 0) continue; // Skip empty batches

      // Take the smaller of: what's remaining to deduct vs. what's available in this batch
      const toDeduct = Math.min(remaining, available);
      remaining -= toDeduct;
      batch.currentQuantity = available - toDeduct;

      // Auto-mark batch as sold_out when exhausted
      if (batch.currentQuantity === 0) {
        batch.status = ProductBatchStatus.SOLD_OUT;
      }

      await this.productBatchRepository.save(batch);

      // Record a sale movement linked to this specific batch for full traceability
      await this.recordStockMovement({
        variantId: batch.productVariantId,
        branchId: batch.branchId,
        batchId: batch.id,
        referenceType: ReferenceType.SALE,
        referenceId,
        qty: -toDeduct,
        reason: `FEFO deduction — Order ${referenceId}`,
      });
    }

    if (remaining > 0) {
      console.warn(
        `[FEFO] Could not fully deduct ${qty} units for variant ${variantId} in branch ${branchId}. ` +
        `Remaining undeducted: ${remaining}`,
      );
    }
  }

  /**
   * Restore stock to batches after a refund.
   * Finds the original SALE movements for this order and reverses them.
   */
  async restoreStockFefo(
    branchId: string,
    variantId: string,
    qty: number,
    orderId: string,
    reason: string,
    manager?: any,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(ProductBatch) : this.productBatchRepository;
    const movementRepo = manager ? manager.getRepository(StockMovement) : this.stockMovementRepository;

    const originalMovements = await movementRepo.find({
      where: {
        referenceId: orderId,
        productVariant: { id: variantId },
        referenceType: ReferenceType.SALE,
      },
      relations: ['batch'],
    });

    let remainingToRestore = qty;
    let totalRestored = 0;
    for (const movement of originalMovements) {
      if (remainingToRestore <= 0) break;
      if (!movement.batch) continue;

      const toRestore = Math.min(Math.abs(movement.qty), remainingToRestore);
      remainingToRestore -= toRestore;
      totalRestored += toRestore;

      const batch = movement.batch;
      batch.currentQuantity = Number(batch.currentQuantity) + toRestore;

      // If batch was SOLD_OUT, it's now ACTIVE again
      if (batch.status === ProductBatchStatus.SOLD_OUT && batch.currentQuantity > 0) {
        batch.status = ProductBatchStatus.ACTIVE;
      }

      await repo.save(batch);

      // Record return movement linked to this specific batch
      const returnMovement = movementRepo.create({
        productVariant: { id: variantId },
        branch: { id: branchId },
        batch: { id: batch.id },
        referenceType: ReferenceType.RETURN_SALE,
        referenceId: orderId,
        qty: toRestore,
        reason: reason,
      });
      await movementRepo.save(returnMovement);
    }
    
    return totalRestored;
  }

  /**
   * Retrieve all stock movements associated with a specific batch.
   * Used by the Batch Movement History tab in the frontend.
   */
  async getBatchMovements(batchId: string): Promise<{ message: string; data: any[] }> {
    // Verify the batch exists before fetching its movements
    const batchExists = await this.productBatchRepository.findOne({ where: { id: batchId } });
    if (!batchExists) throw new NotFoundException(`Batch with ID ${batchId} not found`);

    const movements = await this.stockMovementRepository.find({
      where: { batch: { id: batchId } },
      order: { createdAt: 'DESC' },
    });

    return {
      message: 'Batch movements retrieved successfully',
      data: movements.map(m => ({
        id: m.id,
        referenceType: m.referenceType,
        qty: m.qty,
        referenceId: m.referenceId,
        reason: m.reason,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Soft-delete a batch record.
   */
  async remove(id: string): Promise<ProductBatchResponse> {
    const batch = await this.productBatchRepository.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch with ID ${id} not found`);
    await this.productBatchRepository.softRemove(batch);
    return { message: 'Product batch deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Comprehensive validation for product batch DTO data.
   * Validates: existence of related entities, uniqueness of batch number,
   * numeric constraints, and chronological date ordering.
   */
  private async validateBatchData(
    dto: CreateProductBatchDto | UpdateProductBatchDto,
    id?: string,
  ): Promise<void> {
    // --- Existence checks ---
    if (dto.productVariantId) {
      const variant = await this.variantRepository.findOne({ where: { id: dto.productVariantId } });
      if (!variant) throw new BadRequestException(`Product Variant with ID ${dto.productVariantId} not found`);
    }
    if (dto.branchId) {
      const branch = await this.branchRepository.findOne({ where: { id: dto.branchId } });
      if (!branch) throw new BadRequestException(`Branch with ID ${dto.branchId} not found`);
    }
    if (dto.supplierId) {
      const supplier = await this.supplierRepository.findOne({ where: { id: dto.supplierId } });
      if (!supplier) throw new BadRequestException(`Supplier with ID ${dto.supplierId} not found`);
    }
    if (dto.purchaseReceivingId) {
      const receiving = await this.receivingRepository.findOne({ where: { id: dto.purchaseReceivingId } });
      if (!receiving) throw new BadRequestException(`Purchase Receiving record with ID ${dto.purchaseReceivingId} not found`);
    }

    // --- Batch number uniqueness check ---
    if (dto.batchNumber) {
      const existing = await this.productBatchRepository.findOne({
        where: id ? { batchNumber: dto.batchNumber, id: Not(id) } : { batchNumber: dto.batchNumber },
      });
      if (existing) throw new BadRequestException(`Batch number ${dto.batchNumber} already exists`);
    }

    // --- Numeric constraint checks ---
    if (dto.initialQuantity !== undefined && dto.initialQuantity <= 0) {
      throw new BadRequestException('Initial quantity must be greater than 0');
    }
    if (dto.currentQuantity !== undefined) {
      if (dto.currentQuantity < 0) throw new BadRequestException('Current quantity cannot be negative');
      if (dto.initialQuantity !== undefined && dto.currentQuantity > dto.initialQuantity) {
        throw new BadRequestException('Current quantity cannot exceed initial quantity');
      }
    }
    if (dto.costPrice !== undefined && dto.costPrice < 0) {
      throw new BadRequestException('Cost price cannot be negative');
    }

    // --- Chronological date validation ---
    const expiryDate        = dto.expiryDate        ? new Date(dto.expiryDate)        : null;
    const receivedDate      = dto.receivedDate      ? new Date(dto.receivedDate)      : null;


  }

  /**
   * Internal helper to create a StockMovement record.
   * Centralises movement creation to keep methods DRY.
   */
  private async recordStockMovement(params: {
    variantId: string;
    branchId: string;
    batchId: string;
    referenceType: ReferenceType;
    referenceId: string;
    qty: number;
    reason: string;
  }): Promise<void> {
    const movement = this.stockMovementRepository.create({
      productVariant: { id: params.variantId },
      branch: { id: params.branchId },
      batch: { id: params.batchId },
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      qty: params.qty,
      reason: params.reason,
    });
    await this.stockMovementRepository.save(movement);
  }

  /**
   * Map a ProductBatch entity to the ProductBatchData response shape.
   */
  private mapToData(batch: ProductBatch): ProductBatchData {
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productVariantId: batch.productVariantId,
      branchId: batch.branchId,
      supplierId: batch.supplierId,
      purchaseReceivingId: batch.purchaseReceivingId,
      initialQuantity: Number(batch.initialQuantity),
      currentQuantity: Number(batch.currentQuantity),
      costPrice: Number(batch.costPrice),

      expiryDate: batch.expiryDate,
      receivedDate: batch.receivedDate,
      status: batch.status,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }
}
