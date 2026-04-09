import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NodeType } from '@prisma/client';

/**
 * 创建节点 DTO
 */
export class CreateNodeDto {
  @ApiProperty({ description: '租户 ID' })
  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @ApiProperty({ enum: NodeType, description: '节点类型' })
  @IsNotEmpty()
  @IsEnum(NodeType)
  type: NodeType;

  @ApiProperty({ description: '节点名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '资源 Code 或角色 Code（租户内唯一）' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'X 坐标' })
  @IsOptional()
  @IsInt()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y 坐标' })
  @IsOptional()
  @IsInt()
  positionY?: number;

  @ApiPropertyOptional({ description: '节点配置（JSON）' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

/**
 * 更新节点 DTO
 */
export class UpdateNodeDto {
  @ApiPropertyOptional({ description: '节点名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'X 坐标' })
  @IsOptional()
  @IsInt()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y 坐标' })
  @IsOptional()
  @IsInt()
  positionY?: number;

  @ApiPropertyOptional({ description: '节点配置（JSON）' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
