import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EdgeType } from '@prisma/client';

/**
 * 创建连线 DTO
 */
export class CreateEdgeDto {
  @IsNotEmpty()
  @IsString()
  tenantId: string;  // 租户 ID

  @IsNotEmpty()
  @IsString()
  sourceNodeId: string;

  @IsNotEmpty()
  @IsString()
  targetNodeId: string;

  @IsNotEmpty()
  @IsEnum(EdgeType)
  type: EdgeType;

  @IsOptional()
  config?: any;
}

/**
 * 更新连线 DTO
 */
export class UpdateEdgeDto {
  @IsOptional()
  @IsEnum(EdgeType)
  type?: EdgeType;

  @IsOptional()
  config?: any;
}
