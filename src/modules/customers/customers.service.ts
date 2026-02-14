import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { errCustomerMessage } from 'src/libs/errors/error_customer';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Repository } from 'typeorm';
import { successCustomerMessage } from 'src/libs/success/success_customer';
import { CustomerResponse } from 'src/types/response/customer.type';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Customer) private readonly customersRepository: Repository<Customer>,
  ){}

  async create(createCustomerDto: CreateCustomerDto):Promise<CustomerResponse> {
    try {
      // find customers by email
      const findCustomer = await this.customersRepository.findOne({
        where: {
          email: createCustomerDto.email,
        },
      });
      // if customer exists, throw error
      if (findCustomer) {
        throw new HttpException(errCustomerMessage.ERR_CUSTOMER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
      }
      // create customer
      const customer = this.customersRepository.create(createCustomerDto);
      await this.customersRepository.save(customer);
      return {
        message: successCustomerMessage.SUCCESS_CUSTOMER_CREATE,
        data: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          country: customer.country,
          loyalPoints: customer.loyalPoints,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        }
      };
    } catch (error) {
      this.logger.error(errCustomerMessage.ERR_CUSTOMER_CREATE, error.message)
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(errCustomerMessage.ERR_CUSTOMER_CREATE, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // find all customers
  async findAll():Promise<CustomerResponse> {
    try {
      // find all customers
      const customers = await this.customersRepository.find();
      return {
        message: successCustomerMessage.SUCCESS_CUSTOMER_FIND_ALL,
        datas: customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          country: customer.country,
          loyalPoints: customer.loyalPoints,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errCustomerMessage.ERR_CUSTOMER_FIND_ALL, error.message)
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(errCustomerMessage.ERR_CUSTOMER_FIND_ALL, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // find customer by id
  async findOne(id: string):Promise<CustomerResponse>{
    try {
      // find customer by id
      const customer = await this.customersRepository.findOne({
        where: {
          id,
        },
      });
      // if customer not exists, throw error
      if (!customer) {
        throw new HttpException(errCustomerMessage.ERR_CUSTOMER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return {
        message: successCustomerMessage.SUCCESS_CUSTOMER_FIND_ID,
        data: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          country: customer.country,
          loyalPoints: customer.loyalPoints,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        }
      };
    } catch (error) {
      this.logger.error(errCustomerMessage.ERR_CUSTOMER_FIND_ID, error.message)
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(errCustomerMessage.ERR_CUSTOMER_FIND_ID, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // update customer by id
  async update(id: string, updateCustomerDto: UpdateCustomerDto):Promise<CustomerResponse> {
    try {
      // find customer id
      const findCustomer = await this.findOne(id);
      // update customer
      await this.customersRepository.update(id, updateCustomerDto);
      return {
        message: successCustomerMessage.SUCCESS_CUSTOMER_UPDATE,
        data: {
          id: findCustomer.data.id,
          name: findCustomer.data.name,
          email: findCustomer.data.email,
          phone: findCustomer.data.phone,
          address: findCustomer.data.address,
          city: findCustomer.data.city,
          country: findCustomer.data.country,
          loyalPoints: findCustomer.data.loyalPoints,
          createdAt: findCustomer.data.createdAt,
          updatedAt: findCustomer.data.updatedAt,
        }
      };
    } catch (error) {
      this.logger.error(errCustomerMessage.ERR_CUSTOMER_UPDATE, error.message)
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(errCustomerMessage.ERR_CUSTOMER_UPDATE, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // remove customer by id
  async remove(id: string):Promise<CustomerResponse> {
    try {
      // find customer id
      await this.findOne(id);
      // remove customer
      await this.customersRepository.softDelete(id);
      return {
        message: successCustomerMessage.SUCCESS_CUSTOMER_REMOVE,
      };
    } catch (error) {
      this.logger.error(errCustomerMessage.ERR_CUSTOMER_REMOVE, error.message)
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(errCustomerMessage.ERR_CUSTOMER_REMOVE, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
