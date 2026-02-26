import { PartialType } from "@nestjs/mapped-types";
import { IsString } from "class-validator";

export class CreatePermissionDto {
  @IsString({ message: 'Module must be a string' })
  module: string;
  @IsString({ message: 'Action must be a string' })
  action: string;
  @IsString({ message: 'Description must be a string' })
  description: string;
}

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}
