import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { IamService } from './iam.service';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 批量分配用户角色 DTO
 */
class BatchAssignUserRoleDto {
  @ApiProperty({ description: '用户 ID' })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({ description: '角色 ID 列表', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  roleIds!: string[];

  @ApiPropertyOptional({ description: '租户 ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

/**
 * 用户角色管理控制器
 * 提供独立的用户-角色关联 CRUD 操作
 */
@ApiTags('用户角色管理')
@Controller('user-roles')
export class UserRoleController {
  constructor(private readonly iamService: IamService) {}

  @Get()
  @ApiOperation({ summary: '查询用户角色关联列表', description: '支持按租户过滤' })
  @ApiResponse({ status: 200, description: '成功返回用户角色关联列表' })
  async findAllUserRoles(@TenantId() tenantId: string) {
    return this.iamService.findAllUserRoles(tenantId);
  }

  @Post()
  @ApiOperation({ summary: '批量分配角色', description: '为用户批量分配多个角色' })
  @ApiBody({ type: BatchAssignUserRoleDto })
  @ApiResponse({ status: 201, description: '角色分配成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async batchAssignRoles(
    @Body() dto: BatchAssignUserRoleDto,
    @TenantId() tenantId: string,
  ) {
    return this.iamService.batchAssignRoles({
      ...dto,
      tenantId: dto.tenantId ?? tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: '移除用户角色', description: '删除指定的用户-角色关联记录' })
  @ApiParam({ name: 'id', description: '用户角色关联 ID' })
  @ApiResponse({ status: 200, description: '角色移除成功' })
  @ApiResponse({ status: 404, description: '关联记录不存在' })
  async removeUserRole(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return this.iamService.removeUserRole(id, tenantId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '查询指定用户的角色', description: '返回用户关联的所有角色及详细信息' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '成功返回用户角色列表' })
  async findUserRoles(
    @Param('userId') userId: string,
    @TenantId() tenantId: string,
  ) {
    return this.iamService.findUserRolesWithDetails(userId, tenantId);
  }
}
