import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errDiscountMessage } from 'src/libs/errors/error_discount';
import { successDiscountMessage } from 'src/libs/success/success_discount';
import { DiscountResponse } from 'src/types/response/discount.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';
import { UserLogsService } from '../user_logs/user_logs.service';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
} from './dto/create-discount.dto';
import { Discount } from './entities/discount.entity';

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
    private readonly userLogsService: UserLogsService,
  ) {}
  // create discount
  async create(
    createDiscountDto: CreateDiscountDto,
    userId?: string,
    branchId?: string,
    ipAddress?: string,
  ): Promise<DiscountResponse> {
    try {
      // find discount by name
      const findDiscount = await this.discountRepository.findOne({
        where: {
          name: createDiscountDto.name,
        },
      });
      // if discount exists, throw error
      if (findDiscount) {
        throw new HttpException(
          errDiscountMessage.ERR_DISCOUNT_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        );
      }
      // create discount
      const discount = this.discountRepository.create({
        ...createDiscountDto,
      });
      await this.discountRepository.save(discount);

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        branchId,
        action: ActionType.CREATE,
        entityType: EntityType.DISCOUNT,
        entityId: discount.id,
        description: `Discount "${discount.name}" created (${discount.type} - ${discount.value})`,
        metadata: { type: discount.type, value: discount.value },
        ipAddress,
      });
      return {
        message: successDiscountMessage.SUCCESS_DISCOUNT_CREATED,
      };
    } catch (error) {
      this.logger.error(errDiscountMessage.ERR_DISCOUNT_CREATE, error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errDiscountMessage.ERR_DISCOUNT_CREATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all discount
  async findAll(_branchId?: string): Promise<DiscountResponse> {
    try {
      // find all discounts
      const discounts = await this.discountRepository.find();

      if (discounts.length === 0) {
        this.logger.warn(
          errDiscountMessage.ERR_DISCOUNT_NOT_FOUND,
          'Discounts not found',
        );
        throw new NotFoundException({
          message: errDiscountMessage.ERR_DISCOUNT_NOT_FOUND,
          data: null,
        });
      }

      return {
        message: successDiscountMessage.SUCCESS_DISCOUNT_FIND_ALL,
        datas: discounts.map((discount) => ({
          id: discount.id,
          name: discount.name,
          description: discount.description,
          type: discount.type,
          value: discount.value,
          isActive: discount.isActive,
          createdAt: discount.createdAt,
          updatedAt: discount.updatedAt,
          startDate: discount.startDate,
          endDate: discount.endDate,
        })),
      };
    } catch (error) {
      this.logger.error(errDiscountMessage.ERR_DISCOUNT_NOT_FOUND, error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errDiscountMessage.ERR_DISCOUNT_NOT_FOUND,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, _branchId?: string): Promise<DiscountResponse> {
    try {
      // find discount by id
      const discount = await this.discountRepository.findOne({
        where: {
          id,
        },
      });

      // if discount not exists, throw error
      if (!discount) {
        throw new NotFoundException({
          message: errDiscountMessage.ERR_DISCOUNT_NOT_FOUND,
          data: null,
        });
      }
      return {
        message: successDiscountMessage.SUCCESS_DISCOUNT_FOUND,
        data: {
          id: discount.id,
          name: discount.name,
          description: discount.description,
          type: discount.type,
          value: discount.value,
          isActive: discount.isActive,
          createdAt: discount.createdAt,
          updatedAt: discount.updatedAt,
          startDate: discount.startDate,
          endDate: discount.endDate,
        },
      };
    } catch (error) {
      this.logger.error(errDiscountMessage.ERR_DISCOUNT_NOT_FOUND, error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errDiscountMessage.ERR_DISCOUNT_NOT_FOUND,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update discount
  async update(
    id: string,
    updateDiscountDto: UpdateDiscountDto,
    userId?: string,
    branchId?: string,
    ipAddress?: string,
  ): Promise<DiscountResponse> {
    try {
      // find discount by id
      const findDiscount = await this.findOne(id);
      // update discount
      await this.discountRepository.update(id, updateDiscountDto);

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        branchId,
        action: ActionType.UPDATE,
        entityType: EntityType.DISCOUNT,
        entityId: id,
        description: `Discount "${findDiscount.data?.name}" updated`,
        metadata: {
          name: updateDiscountDto.name,
          value: updateDiscountDto.value,
        },
        ipAddress,
      });
      return {
        message: successDiscountMessage.SUCCESS_DISCOUNT_UPDATED,
        data: {
          id: findDiscount.data.id,
          name: findDiscount.data.name,
          description: findDiscount.data.description,
          type: findDiscount.data.type,
          value: findDiscount.data.value,
          isActive: findDiscount.data.isActive,
          createdAt: findDiscount.data.createdAt,
          updatedAt: findDiscount.data.updatedAt,
          startDate: findDiscount.data.startDate,
          endDate: findDiscount.data.endDate,
        },
      };
    } catch (error) {
      this.logger.error(errDiscountMessage.ERR_DISCOUNT_UPDATE, error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errDiscountMessage.ERR_DISCOUNT_UPDATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete discount
  async remove(
    id: string,
    userId?: string,
    branchId?: string,
    ipAddress?: string,
  ): Promise<DiscountResponse> {
    try {
      // find discount by id
      const findDiscount = await this.findOne(id);
      // delete discount
      await this.discountRepository.softDelete(id);

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        branchId,
        action: ActionType.DELETE,
        entityType: EntityType.DISCOUNT,
        entityId: id,
        description: `Discount "${findDiscount.data?.name}" deleted`,
        ipAddress,
      });
      return {
        message: successDiscountMessage.SUCCESS_DISCOUNT_DELETED,
      };
    } catch (error) {
      this.logger.error(errDiscountMessage.ERR_DISCOUNT_DELETE, error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errDiscountMessage.ERR_DISCOUNT_DELETE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
