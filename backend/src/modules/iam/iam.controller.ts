import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { IamService } from './iam.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';
import { CreateResourceMetaDto, UpdateResourceMetaDto } from './dto/resource-meta.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * IAM 权限管理控制器
 * 管理角色、用户角色分配和资源元数据
 * 
 * tenantId 统一从请求头 `x-tenant-id` 获取，Body 中不再需要 tenantId 字段
 */
@ApiTags('IAM 权限管理')
@Controller('iam')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  // ==================== 角色管理 ====================

  @Get('roles')
  @ApiOperation({ summary: '获取所有角色列表', description: '按租户获取所有角色定义' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '成功返回角色列表' })
  async findAllRoles(@TenantId() tenantId: string) {
    return this.iamService.findAllRoles(tenantId);
  }

  @Get('roles/:id')
  @ApiOperation({ summary: '根据 ID 获取角色详情' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '成功返回角色详情' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async findRoleById(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.iamService.findRoleById(id, tenantId);
  }

  @Post('roles')
  @ApiOperation({ summary: '创建角色', description: '新建一个角色定义' })
  @ApiBody({ type: CreateRoleDto })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 201, description: '角色创建成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async createRole(@Body() dto: CreateRoleDto, @TenantId() tenantId: string) {
    return this.iamService.createRole({ ...dto, tenantId });
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: '删除角色', description: '删除指定角色及其关联的用户角色分配' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '角色删除成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async deleteRole(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.iamService.deleteRole(id, tenantId);
  }

  // ==================== 用户角色管理 ====================

  @Get('users/:userId/roles')
  @ApiOperation({ summary: '获取用户角色', description: '查询指定用户被分配的所有角色' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '成功返回用户角色列表' })
  async getUserRoles(@Param('userId') userId: string, @TenantId() tenantId: string) {
    return this.iamService.getUserRoles(userId, tenantId);
  }

  @Post('users/roles')
  @ApiOperation({ summary: '分配角色给用户', description: '将指定角色分配给用户' })
  @ApiBody({ type: AssignRoleToUserDto })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 201, description: '角色分配成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async assignRoleToUser(@Body() dto: AssignRoleToUserDto, @TenantId() tenantId: string) {
    return this.iamService.assignRoleToUser({ ...dto, tenantId });
  }

  // ==================== 权限查询 ====================

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: '获取用户权限', description: '结合拓扑图计算用户的最终权限' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '成功返回用户权限详情' })
  async getUserPermissions(@Param('userId') userId: string, @TenantId() tenantId: string) {
    return this.iamService.getUserPermissions(userId, tenantId);
  }

  // ==================== 资源元数据管理 ====================

  @Get('resources/meta')
  @ApiOperation({ summary: '获取所有资源元数据列表', description: '按租户获取所有资源元数据定义' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '成功返回资源元数据列表' })
  async findAllResourceMetas(@TenantId() tenantId: string) {
    return this.iamService.findAllResourceMetas(tenantId);
  }

  @Get('resources/meta/:resourceCode')
  @ApiOperation({ summary: '根据资源编码获取元数据详情' })
  @ApiParam({ name: 'resourceCode', description: '资源编码' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '成功返回资源元数据详情' })
  @ApiResponse({ status: 404, description: '资源元数据不存在' })
  async findResourceMetaByCode(@Param('resourceCode') resourceCode: string, @TenantId() tenantId: string) {
    return this.iamService.findResourceMetaByCode(resourceCode, tenantId);
  }

  @Post('resources/meta')
  @ApiOperation({ summary: '创建资源元数据', description: '新建资源元数据定义，包含字段结构' })
  @ApiBody({ type: CreateResourceMetaDto })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 201, description: '资源元数据创建成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async createResourceMeta(@Body() dto: CreateResourceMetaDto, @TenantId() tenantId: string) {
    return this.iamService.createResourceMeta({ ...dto, tenantId });
  }

  @Put('resources/meta/:resourceCode')
  @ApiOperation({ summary: '更新资源元数据', description: '更新资源元数据的名称或字段定义' })
  @ApiParam({ name: 'resourceCode', description: '资源编码' })
  @ApiBody({ type: UpdateResourceMetaDto })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '资源元数据更新成功' })
  @ApiResponse({ status: 404, description: '资源元数据不存在' })
  async updateResourceMeta(@Param('resourceCode') resourceCode: string, @Body() dto: UpdateResourceMetaDto, @TenantId() tenantId: string) {
    return this.iamService.updateResourceMeta(resourceCode, tenantId, dto);
  }

  @Delete('resources/meta/:resourceCode')
  @ApiOperation({ summary: '删除资源元数据', description: '删除指定资源元数据定义' })
  @ApiParam({ name: 'resourceCode', description: '资源编码' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '资源元数据删除成功' })
  @ApiResponse({ status: 404, description: '资源元数据不存在' })
  async deleteResourceMeta(@Param('resourceCode') resourceCode: string, @TenantId() tenantId: string) {
    return this.iamService.deleteResourceMeta(resourceCode, tenantId);
  }
}
