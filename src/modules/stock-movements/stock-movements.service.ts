import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
  ) {}

  async create(createStockMovementDto: CreateStockMovementDto) {
    try {
      const { productId, variantId, branchId, ...rest } =
        createStockMovementDto;

      const stockMovement = this.stockMovementRepository.create({
        ...rest,
        product: productId ? { id: productId } : undefined,
        productVariant: variantId ? { id: variantId } : undefined,
        branch: { id: branchId },
      });

      await this.stockMovementRepository.save(stockMovement);
      return stockMovement;
    } catch (error) {
      throw new NotFoundException('Failed to create stock movement');
    }
  }

  async findAll() {
    try {
      const stockMovements = await this.stockMovementRepository.find({
        relations: ['product', 'productVariant', 'branch'],
        order: { createdAt: 'DESC' },
      });

      return stockMovements;
    } catch (error) {
      throw new NotFoundException('Failed to fetch stock movements');
    }
  }

  async findOne(id: string) {
    try {
      const stockMovement = await this.stockMovementRepository.findOne({
        where: { id },
        relations: ['product', 'productVariant', 'branch'],
      });

      if (!stockMovement) {
        throw new NotFoundException(`Stock movement with ID ${id} not found`);
      }

      return stockMovement;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Failed to fetch stock movement');
    }
  }

  update(id: number, updateStockMovementDto: UpdateStockMovementDto) {
    return `This action updates a #${id} stockMovement`;
  }

  remove(id: number) {
    return `This action removes a #${id} stockMovement`;
  }
}
