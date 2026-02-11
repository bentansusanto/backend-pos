import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errBranchMessage } from 'src/libs/errors/error_branch';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateBranchDto, UpdateBranchDto } from './dto/create-branch.dto';
import { Branch } from './entities/branch.entity';
import { successBranchMessage } from 'src/libs/success/success_branch';
import { BranchResponse } from 'src/types/response/branch.type';

@Injectable()
export class BranchesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}
  private generateCode(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
  // create branches
  async create(createBranchDto: CreateBranchDto): Promise<BranchResponse> {
    try {
      // check if branch already exist
      const branch = await this.branchRepository.findOne({
        where: {
          name: createBranchDto.name,
        },
      });
      if (branch) {
        throw new HttpException(
          errBranchMessage.BRANCH_CODE_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        );
      }
      // create branch
      const branchEntity = this.branchRepository.create({
        ...createBranchDto,
        code: this.generateCode(createBranchDto.name),
      });
      await this.branchRepository.save(branchEntity);
      return {
        message: successBranchMessage.BRANCH_CREATED,
        data: {
          id: branchEntity.id,
          name: branchEntity.name,
          code: branchEntity.code,
          address: branchEntity.address,
          phone: branchEntity.phone,
          email: branchEntity.email,
          city: branchEntity.city,
          province: branchEntity.province,
          isActive: branchEntity.isActive,
        },
      };
    } catch (error) {
      this.logger.error(errBranchMessage.BRANCH_FAILED_CREATE, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errBranchMessage.BRANCH_FAILED_CREATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all branches
  async findAll(): Promise<BranchResponse> {
    try {
      const branches = await this.branchRepository.find();
      if (branches.length === 0) {
        this.logger.warn(errBranchMessage.BRANCH_NOT_FOUND);
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successBranchMessage.BRANCH_FOUND_ALL,
        datas: branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          city: branch.city,
          province: branch.province,
          isActive: branch.isActive,
        })),
      };
    } catch (error) {
      this.logger.error(errBranchMessage.BRANCH_FAILED_CREATE, error.stack);
      throw new HttpException(
        errBranchMessage.BRANCH_FAILED_CREATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find branch by id
  async findOne(id: string): Promise<BranchResponse> {
    try {
      const branch = await this.branchRepository.findOne({
        where: {
          id,
        },
      });
      if (!branch) {
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successBranchMessage.BRANCH_FOUND,
        data: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          city: branch.city,
          province: branch.province,
          isActive: branch.isActive,
        },
      };
    } catch (error) {
      this.logger.error(errBranchMessage.BRANCH_FAILED_CREATE, error.stack);
      throw new HttpException(
        errBranchMessage.BRANCH_FAILED_CREATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateBranchDto: UpdateBranchDto,
  ): Promise<BranchResponse> {
    try {
      const branch = await this.branchRepository.findOne({
        where: {
          id,
        },
      });
      if (!branch) {
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.branchRepository.update(id, updateBranchDto);
      return {
        message: successBranchMessage.BRANCH_UPDATED,
        data: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          city: branch.city,
          province: branch.province,
          isActive: branch.isActive,
        },
      };
    } catch (error) {
      this.logger.error(errBranchMessage.BRANCH_FAILED_UPDATE, error.stack);
      throw new HttpException(
        errBranchMessage.BRANCH_FAILED_UPDATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<BranchResponse> {
    try {
      const branch = await this.branchRepository.findOne({
        where: {
          id,
        },
      });
      if (!branch) {
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.branchRepository.delete(id);
      return {
        message: successBranchMessage.BRANCH_DELETED,
        data: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          city: branch.city,
          province: branch.province,
          isActive: branch.isActive,
        },
      };
    } catch (error) {
      this.logger.error(errBranchMessage.BRANCH_FAILED_DELETE, error.stack);
      throw new HttpException(
        errBranchMessage.BRANCH_FAILED_DELETE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
