import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { IamService } from './iam.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * IAM 权限管理控制器
 */
@Controller('iam')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  // ==================== 角色管理 ====================

  @Get('roles')
  async findAllRoles(@TenantId() tenantId: string) {
    return this.iamService.findAllRoles(tenantId);
  }

  @Get('roles/:id')
  async findRoleById(@Param('id') id: string) {
    return this.iamService.findRoleById(id);
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto, @TenantId() tenantId: string) {
    return this.iamService.createRole({ ...dto, tenantId });
  }

  // ==================== 用户角色管理 ====================

  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId') userId: string, @TenantId() tenantId: string) {
    return this.iamService.getUserRoles(userId, tenantId);
  }

  @Post('users/roles')
  async assignRoleToUser(@Body() dto: AssignRoleToUserDto, @TenantId() tenantId: string) {
    return this.iamService.assignRoleToUser({ ...dto, tenantId });
  }

  // ==================== 权限查询 ====================

  @Get('users/:userId/permissions')
  async getUserPermissions(@Param('userId') userId: string, @TenantId() tenantId: string) {
    return this.iamService.getUserPermissions(userId, tenantId);
  }
}
