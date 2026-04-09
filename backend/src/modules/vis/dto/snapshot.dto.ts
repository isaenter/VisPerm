import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建快照 DTO
 */
export class CreateSnapshotDto {
  @ApiProperty({ description: '拓扑 ID' })
  @IsNotEmpty()
  @IsString()
  topologyId!: string;

  @ApiPropertyOptional({ description: '租户 ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

/**
 * 回滚快照 DTO
 */
export class RollbackSnapshotDto {
  @ApiPropertyOptional({ description: '租户 ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
