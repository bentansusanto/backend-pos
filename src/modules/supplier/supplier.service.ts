import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errSupplierMessage } from 'src/libs/errors/error_supplier';
import { successSupplierMessage } from 'src/libs/success/success_supplier';
import { SupplierResponse } from 'src/types/response/supplier.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SupplierService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  // create supplier
  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponse> {
    try {
      // check if supplier with same email already exists
      const existingSupplier = await this.supplierRepository.findOne({
        where: { email: createSupplierDto.email },
      });
      if (existingSupplier) {
        throw new HttpException(
          'Supplier with this email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      // create and save supplier
      const supplier = this.supplierRepository.create({ ...createSupplierDto });
      await this.supplierRepository.save(supplier);

      return {
        message: successSupplierMessage.SUCCESS_CREATE_SUPPLIER,
      };
    } catch (error) {
      this.logger.error(errSupplierMessage.ERROR_CREATE_SUPPLIER, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errSupplierMessage.ERROR_CREATE_SUPPLIER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all suppliers
  async findAll(): Promise<SupplierResponse> {
    try {
      const suppliers = await this.supplierRepository.find();
      if (suppliers.length === 0) {
        this.logger.warn(
          errSupplierMessage.ERROR_FIND_ALL_SUPPLIER,
          'Suppliers not found',
        );
        throw new NotFoundException({
          message: errSupplierMessage.ERROR_FIND_ALL_SUPPLIER,
          data: null,
        });
      }

      return {
        message: successSupplierMessage.SUCCESS_FIND_ALL_SUPPLIER,
        datas: suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          province: supplier.province,
          country: supplier.country,
          postalCode: supplier.postalCode,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        errSupplierMessage.ERROR_FIND_ALL_SUPPLIER,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errSupplierMessage.ERROR_FIND_ALL_SUPPLIER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find one supplier by id
  async findOne(id: string): Promise<SupplierResponse> {
    try {
      const supplier = await this.supplierRepository.findOne({ where: { id } });
      if (!supplier) {
        throw new NotFoundException({
          message: errSupplierMessage.ERROR_FIND_SUPPLIER,
          data: null,
        });
      }

      return {
        message: successSupplierMessage.SUCCESS_FIND_SUPPLIER,
        data: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          province: supplier.province,
          country: supplier.country,
          postalCode: supplier.postalCode,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errSupplierMessage.ERROR_FIND_SUPPLIER, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errSupplierMessage.ERROR_FIND_SUPPLIER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update supplier
  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    try {
      // verify supplier exists
      const existingSupplier = await this.findOne(id);

      await this.supplierRepository.update(id, updateSupplierDto);

      return {
        message: successSupplierMessage.SUCCESS_UPDATE_SUPPLIER,
        data: {
          id: existingSupplier.data.id,
          name: existingSupplier.data.name,
          email: existingSupplier.data.email,
          phone: existingSupplier.data.phone,
          address: existingSupplier.data.address,
          city: existingSupplier.data.city,
          province: existingSupplier.data.province,
          country: existingSupplier.data.country,
          postalCode: existingSupplier.data.postalCode,
          createdAt: existingSupplier.data.createdAt,
          updatedAt: existingSupplier.data.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errSupplierMessage.ERROR_UPDATE_SUPPLIER, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errSupplierMessage.ERROR_UPDATE_SUPPLIER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete supplier (soft delete)
  async remove(id: string): Promise<SupplierResponse> {
    try {
      // verify supplier exists
      await this.findOne(id);

      await this.supplierRepository.softDelete(id);

      return {
        message: successSupplierMessage.SUCCESS_DELETE_SUPPLIER,
      };
    } catch (error) {
      this.logger.error(errSupplierMessage.ERROR_DELETE_SUPPLIER, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errSupplierMessage.ERROR_DELETE_SUPPLIER,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
