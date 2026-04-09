import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { NodeType } from '@prisma/client';

/**
 * 创建节点 DTO
 */
export class CreateNodeDto {
  @IsNotEmpty()
  @IsString()
  tenantId: string;  // 租户 ID

  @IsNotEmpty()
  @IsEnum(NodeType)
  type: NodeType;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  positionX?: number;

  @IsOptional()
  @IsInt()
  positionY?: number;

  @IsOptional()
  config?: any;
}

/**
 * 更新节点 DTO
 */
export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  positionX?: number;

  @IsOptional()
  @IsInt()
  positionY?: number;

  @IsOptional()
  config?: any;
}
