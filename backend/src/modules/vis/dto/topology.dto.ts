import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建拓扑 DTO
 */
export class CreateTopologyDto {
  @ApiProperty({ description: '租户 ID' })
  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '拓扑名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '拓扑描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '环境标识', enum: ['prod', 'pre', 'test'], default: 'prod' })
  @IsOptional()
  @IsString()
  env?: string;
}

/**
 * 更新拓扑 DTO
 */
export class UpdateTopologyDto {
  @ApiPropertyOptional({ description: '拓扑名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '拓扑描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '拓扑状态', enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '版本号（乐观锁）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

/**
 * 发布拓扑 DTO
 */
export class PublishTopologyDto {
  @ApiProperty({ description: '版本号（乐观锁）' })
  @IsInt()
  @Min(1)
  version: number;
}
