import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EdgeType } from '@prisma/client';

/**
 * 创建连线 DTO
 */
export class CreateEdgeDto {
  @ApiProperty({ description: '租户 ID' })
  @IsNotEmpty()
  @IsString()
  tenantId: string;  // 租户 ID

  @ApiProperty({ description: '源节点 ID' })
  @IsNotEmpty()
  @IsString()
  sourceNodeId: string;

  @ApiProperty({ description: '目标节点 ID' })
  @IsNotEmpty()
  @IsString()
  targetNodeId: string;

  @ApiProperty({ enum: EdgeType, description: '连线类型' })
  @IsNotEmpty()
  @IsEnum(EdgeType)
  type: EdgeType;

  @ApiPropertyOptional({ description: '连线配置（JSON）' })
  @IsOptional()
  config?: any;
}

/**
 * 更新连线 DTO
 */
export class UpdateEdgeDto {
  @ApiPropertyOptional({ enum: EdgeType, description: '连线类型' })
  @IsOptional()
  @IsEnum(EdgeType)
  type?: EdgeType;

  @ApiPropertyOptional({ description: '连线配置（JSON）' })
  @IsOptional()
  config?: any;
}
