import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 模拟运行请求 DTO
 * 用于在不修改数据库的情况下计算权限
 */
export class SimulationRunDto {
  @ApiPropertyOptional({ description: '角色 ID 集合' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ description: '用户 ID 集合（将自动展开为用户关联的所有角色）' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: '租户 ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Dry Run 模式：仅计算不持久化（默认 true）' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: '环境标识：prod/pre/test' })
  @IsOptional()
  @IsString()
  env?: string;
}

/**
 * 模拟运行中单个资源的权限详情
 */
export class SimulatedResourceDto {
  resourceCode: string;
  resourceName: string;
  /** 该资源是通过哪些路径获得的 */
  viaPaths: string[];
  /** 最终权限类型: granted / denied */
  effectivePermission: 'granted' | 'denied';
  /** 应用了哪些过滤器 */
  appliedFilters: string[];
}
