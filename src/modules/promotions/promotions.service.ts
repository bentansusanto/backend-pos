import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionRule } from './entities/promotion-rule.entity';
import { PromotionBranch } from './entities/promotion-branch.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Category } from '../products/entities/category.entities';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
} from './dto/create-promotion.dto';
import {
  PromotionResponse,
  PromotionData,
  PromotionRuleData,
} from '../../types/response/promotion.type';
import { UserLogsService } from '../user_logs/user_logs.service';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';
import { errPromotionMessage } from 'src/libs/errors/error_promotion';
import { successPromotionMessage } from 'src/libs/success/success_promotion';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(PromotionRule)
    private readonly promotionRuleRepository: Repository<PromotionRule>,
    @InjectRepository(PromotionBranch)
    private readonly promotionBranchRepository: Repository<PromotionBranch>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly userLogsService: UserLogsService,
  ) {}

  async create(
    createPromotionDto: CreatePromotionDto,
    userId?: string,
    branchId?: string,
  ): Promise<PromotionResponse> {
    const { rules, branchIds, ...promotionData } = createPromotionDto;

    // Check if promotion with the same name exists
    const existingPromotion = await this.promotionRepository.findOne({
      where: { name: createPromotionDto.name },
    });
    if (existingPromotion) {
      throw new BadRequestException(
        errPromotionMessage.ERROR_PROMOTION_ALREADY_EXISTS,
      );
    }

    // Date validation
    const startDate = new Date(createPromotionDto.startDate);
    const endDate = new Date(createPromotionDto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException(
        errPromotionMessage.ERROR_INVALID_DATE_RANGE,
      );
    }

    // Rule validation
    if (!rules || rules.length === 0) {
      throw new BadRequestException(
        errPromotionMessage.ERROR_PROMOTION_RULES_EMPTY,
      );
    }

    const promotion = this.promotionRepository.create({
      ...promotionData,
      startDate,
      endDate,
    });

    // Rules and branchRelations will be saved via cascade if configured,
    // but we handle them explicitly for clarity here
    const savedPromotion = await this.promotionRepository.save(promotion);

    // Save branch relations if provided
    if (branchIds && branchIds.length > 0) {
      const branchRelations = branchIds.map((bId) =>
        this.promotionBranchRepository.create({
          promotion: { id: savedPromotion.id },
          branch: { id: bId } as any,
        }),
      );
      await this.promotionBranchRepository.save(branchRelations);
    }

    // Save rules
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const {
          conditionVariantIds,
          conditionCategoryIds,
          actionVariantIds,
          actionCategoryIds,
          ...ruleData
        } = rule;

        const newRule = this.promotionRuleRepository.create({
          ...ruleData,
          promotion: savedPromotion,
        });

        if (conditionVariantIds) {
          newRule.conditionVariants = conditionVariantIds.map(id => ({ id })) as any;
        }
        if (conditionCategoryIds) {
          newRule.conditionCategories = conditionCategoryIds.map(id => ({ id })) as any;
        }
        if (actionVariantIds) {
          newRule.actionVariants = actionVariantIds.map(id => ({ id })) as any;
        }
        if (actionCategoryIds) {
          newRule.actionCategories = actionCategoryIds.map(id => ({ id })) as any;
        }

        await this.promotionRuleRepository.save(newRule);
      }
    }

    this.userLogsService.log({
      userId: userId ?? '',
      branchId,
      action: ActionType.CREATE,
      entityType: EntityType.PROMOTION,
      entityId: savedPromotion.id,
      description: `Promotion "${savedPromotion.name}" created`,
    });

    return {
      message: successPromotionMessage.SUCCESS_PROMOTION_CREATED,
      data: await this.findOneData(savedPromotion.id),
    };
  }

  async findAll(status?: string, branchId?: string): Promise<PromotionResponse> {
    const query = this.promotionRepository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.rules', 'rules')
      .leftJoinAndSelect('rules.conditionVariants', 'conditionVariants')
      .leftJoinAndSelect('rules.conditionCategories', 'conditionCategories')
      .leftJoinAndSelect('rules.actionVariants', 'actionVariants')
      .leftJoinAndSelect('rules.actionCategories', 'actionCategories')
      .leftJoinAndSelect('promotion.branchRelations', 'branchRelations')
      .leftJoinAndSelect('branchRelations.branch', 'branch')
      .leftJoinAndSelect('branchRelations.variants', 'branchVariants')
      .leftJoinAndSelect('branchRelations.categories', 'branchCategories');

    if (status) {
      query.andWhere('promotion.status = :status', { status });
    }

    if (branchId) {
      // Find promotions that are either global (no branch relations)
      // OR specifically assigned to this branchId
      query.andWhere(
        new Brackets((qb) => {
          qb.where('branch.id = :branchId', { branchId }).orWhere(
            (subQb) => {
              const subQuery = subQb
                .subQuery()
                .select('pb.promotionId')
                .from('promotion_branches', 'pb')
                .getQuery();
              return 'promotion.id NOT IN ' + subQuery;
            },
          );
        }),
      );
    }

    query.orderBy('promotion.priority', 'DESC').addOrderBy('promotion.createdAt', 'DESC');

    const promotions = await query.getMany();

    return {
      message: successPromotionMessage.SUCCESS_FIND_ALL_PROMOTIONS,
      datas: promotions.map((p) => this.mapToData(p)),
    };
  }

  async findOne(id: string): Promise<PromotionResponse> {
    const data = await this.findOneData(id);
    return {
      message: successPromotionMessage.SUCCESS_FIND_PROMOTION,
      data,
    };
  }

  private async findOneData(id: string): Promise<PromotionData> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: [
        'rules',
        'rules.conditionVariants',
        'rules.conditionCategories',
        'rules.actionVariants',
        'rules.actionCategories',
        'branchRelations',
        'branchRelations.branch',
        'branchRelations.variants',
        'branchRelations.categories',
      ],
    });

    if (!promotion) {
      throw new NotFoundException(
        errPromotionMessage.ERROR_PROMOTION_NOT_FOUND,
      );
    }

    return this.mapToData(promotion);
  }

  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto,
    userId?: string,
    branchId?: string,
  ): Promise<PromotionResponse> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: ['rules', 'branchRelations'],
    });

    if (!promotion) {
      throw new NotFoundException(
        errPromotionMessage.ERROR_PROMOTION_NOT_FOUND,
      );
    }

    const { rules, branchIds, ...promotionData } = updatePromotionDto;

    // Check if another promotion has the same name
    if (
      updatePromotionDto.name &&
      updatePromotionDto.name !== promotion.name
    ) {
      const existingPromotion = await this.promotionRepository.findOne({
        where: { name: updatePromotionDto.name },
      });
      if (existingPromotion) {
        throw new BadRequestException(
          errPromotionMessage.ERROR_PROMOTION_ALREADY_EXISTS,
        );
      }
    }

    // Date validation
    const startDate = updatePromotionDto.startDate
      ? new Date(updatePromotionDto.startDate)
      : promotion.startDate;
    const endDate = updatePromotionDto.endDate
      ? new Date(updatePromotionDto.endDate)
      : promotion.endDate;
    if (endDate <= startDate) {
      throw new BadRequestException(
        errPromotionMessage.ERROR_INVALID_DATE_RANGE,
      );
    }

    // Handle branches update
    if (branchIds) {
      await this.promotionBranchRepository.delete({ promotion: { id } });
      if (branchIds.length > 0) {
        const branchRelations = branchIds.map((bId) =>
          this.promotionBranchRepository.create({
            promotion: { id },
            branch: { id: bId } as any,
          }),
        );
        await this.promotionBranchRepository.save(branchRelations);
      }
    }

    // Update basic info
    Object.assign(promotion, {
      ...promotionData,
      startDate,
      endDate,
    });

    // Handle rules update if provided (simple replacement for now)
    if (rules) {
      if (rules.length === 0) {
        throw new BadRequestException(
          errPromotionMessage.ERROR_PROMOTION_RULES_EMPTY,
        );
      }
      // Remove old rules
      await this.promotionRuleRepository.delete({ promotion: { id } });

      // Create and save new rules explicitly
      for (const rule of rules) {
        const {
          id: _,
          conditionVariantIds,
          conditionCategoryIds,
          actionVariantIds,
          actionCategoryIds,
          ...ruleData
        } = rule;

        const newRule = this.promotionRuleRepository.create({
          ...ruleData,
          promotion: { id },
        });

        // Handle Many-to-Many relations explicitly for clarity
        if (conditionVariantIds) {
          newRule.conditionVariants = conditionVariantIds.map(vId => ({ id: vId })) as any;
        }
        if (conditionCategoryIds) {
          newRule.conditionCategories = conditionCategoryIds.map(cId => ({ id: cId })) as any;
        }
        if (actionVariantIds) {
          newRule.actionVariants = actionVariantIds.map(vId => ({ id: vId })) as any;
        }
        if (actionCategoryIds) {
          newRule.actionCategories = actionCategoryIds.map(cId => ({ id: cId })) as any;
        }

        await this.promotionRuleRepository.save(newRule);
      }
    }

    const savedPromotion = await this.promotionRepository.save(promotion);

    this.userLogsService.log({
      userId: userId ?? '',
      branchId,
      action: ActionType.UPDATE,
      entityType: EntityType.PROMOTION,
      entityId: id,
      description: `Promotion "${savedPromotion.name}" updated`,
    });

    return {
      message: successPromotionMessage.SUCCESS_PROMOTION_UPDATED,
      data: await this.findOneData(id),
    };
  }

  async remove(
    id: string,
    userId?: string,
    branchId?: string,
  ): Promise<PromotionResponse> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
    });
    if (!promotion) {
      throw new NotFoundException(
        errPromotionMessage.ERROR_PROMOTION_NOT_FOUND,
      );
    }

    await this.promotionRepository.remove(promotion);

    this.userLogsService.log({
      userId: userId ?? '',
      branchId,
      action: ActionType.DELETE,
      entityType: EntityType.PROMOTION,
      entityId: id,
      description: `Promotion "${promotion.name}" deleted`,
    });

    return {
      message: successPromotionMessage.SUCCESS_PROMOTION_DELETED,
    };
  }

  private mapToData(p: Promotion): PromotionData {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      isStackable: p.isStackable,
      startDate: p.startDate,
      endDate: p.endDate,
      branchIds: (p.branchRelations || [])
        .map((br) => (br as any).branch_id || br.branch?.id)
        .filter(Boolean),
      rules: p.rules?.map((r) => this.mapRuleToData(r)) || [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapRuleToData(r: PromotionRule): PromotionRuleData {
    return {
      id: r.id,
      conditionType: r.conditionType,
      conditionValue: r.conditionValue,
      conditionVariantIds: r.conditionVariants?.map((v) => v.id) || [],
      conditionCategoryIds: r.conditionCategories?.map((c) => c.id) || [],
      actionType: r.actionType,
      actionValue: r.actionValue,
      actionVariantIds: r.actionVariants?.map((v) => v.id) || [],
      actionCategoryIds: r.actionCategories?.map((c) => c.id) || [],
    };
  }
}
