import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errTaxMessage } from 'src/libs/errors/error_tax';
import { successTaxMessage } from 'src/libs/success/success_tax';
import { TaxResponse } from 'src/types/response/tax.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { Tax } from './entities/tax.entity';

@Injectable()
export class TaxService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {}

  // create tax
  async create(createTaxDto: CreateTaxDto): Promise<TaxResponse> {
    try {
      // check if tax name already exists
      const existingTax = await this.taxRepository.findOne({
        where: { name: createTaxDto.name },
      });
      if (existingTax) {
        throw new HttpException(
          'Tax with this name already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      // create and save tax
      const tax = this.taxRepository.create({ ...createTaxDto });
      await this.taxRepository.save(tax);

      return {
        message: successTaxMessage.SUCCESS_CREATE_TAX,
      };
    } catch (error) {
      this.logger.error(errTaxMessage.ERROR_CREATE_TAX, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errTaxMessage.ERROR_CREATE_TAX,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all taxes
  async findAll(): Promise<TaxResponse> {
    try {
      // check if tax name already exists
      const taxes = await this.taxRepository.find();
      if (taxes.length === 0) {
        this.logger.warn(errTaxMessage.ERROR_FIND_ALL_TAX, 'Taxes not found');
        throw new NotFoundException({
          message: errTaxMessage.ERROR_FIND_ALL_TAX,
          data: null,
        });
      }

      return {
        message: successTaxMessage.SUCCESS_FIND_ALL_TAX,
        datas: taxes.map((tax) => ({
          id: tax.id,
          name: tax.name,
          rate: tax.rate,
          is_inclusive: tax.is_inclusive,
          is_active: tax.is_active,
          createdAt: tax.createdAt,
          updatedAt: tax.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errTaxMessage.ERROR_FIND_ALL_TAX, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errTaxMessage.ERROR_FIND_ALL_TAX,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find one tax by id
  async findOne(id: string): Promise<TaxResponse> {
    try {
      // check if tax name already exists
      const tax = await this.taxRepository.findOne({ where: { id } });
      if (!tax) {
        throw new NotFoundException({
          message: errTaxMessage.ERROR_FIND_TAX,
          data: null,
        });
      }

      return {
        message: successTaxMessage.SUCCESS_FIND_TAX,
        data: {
          id: tax.id,
          name: tax.name,
          rate: tax.rate,
          is_inclusive: tax.is_inclusive,
          is_active: tax.is_active,
          createdAt: tax.createdAt,
          updatedAt: tax.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errTaxMessage.ERROR_FIND_TAX, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errTaxMessage.ERROR_FIND_TAX,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update tax
  async update(id: string, updateTaxDto: UpdateTaxDto): Promise<TaxResponse> {
    try {
      // verify tax exists
      const existingTax = await this.findOne(id);

      await this.taxRepository.update(id, updateTaxDto);

      return {
        message: successTaxMessage.SUCCESS_UPDATE_TAX,
        data: {
          id: existingTax.data.id,
          name: existingTax.data.name,
          rate: existingTax.data.rate,
          is_inclusive: existingTax.data.is_inclusive,
          is_active: existingTax.data.is_active,
          createdAt: existingTax.data.createdAt,
          updatedAt: existingTax.data.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errTaxMessage.ERROR_UPDATE_TAX, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errTaxMessage.ERROR_UPDATE_TAX,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete tax (soft delete)
  async remove(id: string): Promise<TaxResponse> {
    try {
      // verify tax exists
      await this.findOne(id);

      await this.taxRepository.softDelete(id);

      return {
        message: successTaxMessage.SUCCESS_DELETE_TAX,
      };
    } catch (error) {
      this.logger.error(errTaxMessage.ERROR_DELETE_TAX, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errTaxMessage.ERROR_DELETE_TAX,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
