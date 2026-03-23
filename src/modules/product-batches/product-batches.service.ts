import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CreateProductBatchDto, UpdateProductBatchDto } from './dto/create-product-batch.dto';
import { ProductBatch } from './entities/product-batch.entity';
import { ProductBatchData, ProductBatchResponse } from 'src/types/response/product-batch.type';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Supplier } from '../supplier/entities/supplier.entity';
import { PurchaseReceiving } from '../purchase_receivings/entities/purchase_receiving.entity';

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
  ) {}

  /**
   * Establish a new product batch with strict validation.
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
    return {
      message: 'Product batch created successfully',
      data: this.mapToData(savedBatch),
    };
  }

  /**
   * Find all batches with optional filtering.
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
   * Find a single batch by ID.
   */
  async findOne(id: string): Promise<ProductBatchResponse> {
    const batch = await this.productBatchRepository.findOne({
      where: { id },
    });
    
    if (!batch) throw new NotFoundException(`Batch with ID ${id} not found`);
    return {
      message: 'Product batch retrieved successfully',
      data: this.mapToData(batch),
    };
  }

  /**
   * Update an existing batch with strict validation.
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
   * Soft remove a batch.
   */
  async remove(id: string): Promise<ProductBatchResponse> {
    const batch = await this.productBatchRepository.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch with ID ${id} not found`);
    await this.productBatchRepository.softRemove(batch);
    return {
      message: 'Product batch deleted successfully',
    };
  }

  /**
   * Comprehensive validation for product batch data.
   */
  private async validateBatchData(dto: CreateProductBatchDto | UpdateProductBatchDto, id?: string): Promise<void> {
    // 1. Existence Checks
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

    // 2. Uniqueness Check for Batch Number
    if (dto.batchNumber) {
        const existing = await this.productBatchRepository.findOne({
            where: id ? { batchNumber: dto.batchNumber, id: Not(id) } : { batchNumber: dto.batchNumber }
        });
        if (existing) throw new BadRequestException(`Batch number ${dto.batchNumber} already exists`);
    }

    // 3. Logical/Numeric Validation
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

    // 4. Chronological Validation
    const manufacturingDate = dto.manufacturingDate ? new Date(dto.manufacturingDate) : null;
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    const receivedDate = dto.receivedDate ? new Date(dto.receivedDate) : null;

    if (manufacturingDate && expiryDate && expiryDate <= manufacturingDate) {
        throw new BadRequestException('Expiry date must be after manufacturing date');
    }

    if (manufacturingDate && receivedDate && receivedDate < manufacturingDate) {
        throw new BadRequestException('Received date cannot be before manufacturing date');
    }
  }

  /**
   * Mapper to convert Entity to Response Data object.
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
      manufacturingDate: batch.manufacturingDate,
      expiryDate: batch.expiryDate,
      receivedDate: batch.receivedDate,
      status: batch.status,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }
}
