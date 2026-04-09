import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 资源字段元数据 DTO
 */
export class ResourceFieldDto {
  @ApiProperty({ description: '字段名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '字段类型', example: 'string' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: '字段显示标签' })
  @IsNotEmpty()
  @IsString()
  label: string;
}

/**
 * 创建资源元数据 DTO
 */
export class CreateResourceMetaDto {
  @ApiProperty({ description: '租户 ID' })
  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '资源编码' })
  @IsNotEmpty()
  @IsString()
  resourceCode: string;

  @ApiProperty({ description: '资源名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '资源字段定义列表', type: [ResourceFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceFieldDto)
  fields: ResourceFieldDto[];
}

/**
 * 更新资源元数据 DTO
 */
export class UpdateResourceMetaDto {
  @ApiPropertyOptional({ description: '资源名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '资源字段定义列表', type: [ResourceFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceFieldDto)
  fields?: ResourceFieldDto[];
}
