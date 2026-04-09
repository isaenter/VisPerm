import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @ApiProperty({ description: '租户 ID' })
  @IsNotEmpty()
  @IsString()
  tenantId!: string;  // 租户 ID

  @ApiProperty({ description: '角色名称' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: '角色编码' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: '角色描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * 分配角色给用户 DTO
 */
export class AssignRoleToUserDto {
  @ApiProperty({ description: '租户 ID' })
  @IsNotEmpty()
  @IsString()
  tenantId!: string;  // 租户 ID

  @ApiProperty({ description: '用户 ID' })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({ description: '角色 ID' })
  @IsNotEmpty()
  @IsString()
  roleId!: string;
}
