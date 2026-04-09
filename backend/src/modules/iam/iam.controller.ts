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

/**
 * IAM 权限管理控制器
 */
@Controller('iam')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  // ==================== 角色管理 ====================

  @Get('roles')
  async findAllRoles() {
    return this.iamService.findAllRoles();
  }

  @Get('roles/:id')
  async findRoleById(@Param('id') id: string) {
    return this.iamService.findRoleById(id);
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.iamService.createRole(dto);
  }

  // ==================== 用户角色管理 ====================

  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId') userId: string) {
    return this.iamService.getUserRoles(userId);
  }

  @Post('users/roles')
  async assignRoleToUser(@Body() dto: AssignRoleToUserDto) {
    return this.iamService.assignRoleToUser(dto);
  }

  // ==================== 权限查询 ====================

  @Get('users/:userId/permissions')
  async getUserPermissions(@Param('userId') userId: string) {
    return this.iamService.getUserPermissions(userId);
  }
}
