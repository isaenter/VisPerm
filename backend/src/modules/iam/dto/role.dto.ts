import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * 分配角色给用户 DTO
 */
export class AssignRoleToUserDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  roleId: string;
}
