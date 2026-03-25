import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { errBranchMessage } from 'src/libs/errors/error_branch';
import { successBranchMessage } from 'src/libs/success/success_branch';
import { BranchResponse } from 'src/types/response/branch.type';
import { Repository } from 'typeorm';
import { CreateBranchDto, UpdateBranchDto } from './dto/create-branch.dto';
import { Branch } from './entities/branch.entity';

import { UsersService } from '../rbac/users/users.service';
import { UserBranch } from './entities/user-branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(UserBranch)
    private readonly userBranchRepository: Repository<UserBranch>,
    private readonly usersService: UsersService,
  ) {}
  private generateCode(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
  // create branches
  async create(createBranchDto: CreateBranchDto): Promise<BranchResponse> {
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
  }

  // find all branches
  async findAll(): Promise<BranchResponse> {
    const branches = await this.branchRepository.find();

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
  }

  // find branch by id
  async findOne(id: string): Promise<BranchResponse> {
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
  }

  async update(
    id: string,
    updateBranchDto: UpdateBranchDto,
  ): Promise<BranchResponse> {
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
  }

  async remove(id: string): Promise<BranchResponse> {
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
  }

  // assign user to branch
  async assignUser(branchId: string, userId: string): Promise<any> {
    // check branch
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (!branch) {
      throw new HttpException(
        errBranchMessage.BRANCH_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    // check user
    await this.usersService.findOne(userId);

    // check if already assigned
    const existing = await this.userBranchRepository.findOne({
      where: { branchId, userId },
    });

    if (existing) {
      return {
        message: 'User already assigned to this branch',
      };
    }

    const userBranch = this.userBranchRepository.create({
      branchId,
      userId,
    });

    await this.userBranchRepository.save(userBranch);

    return {
      message: 'User assigned to branch successfully',
    };
  }
}
