import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @IsString()
  @IsNotEmpty()
  role_id: string;

  @IsArray()
  @IsString({ each: true })
  permission_ids: string[];
}
