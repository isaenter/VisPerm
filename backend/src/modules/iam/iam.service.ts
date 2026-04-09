import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';

/**
 * IAM 权限服务
 */
@Injectable()
export class IamService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== 角色管理 ====================

  async findAllRoles() {
    return this.prisma.sysRole.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRoleById(id: string) {
    return this.prisma.sysRole.findUnique({
      where: { id },
    });
  }

  async createRole(dto: CreateRoleDto) {
    return this.prisma.sysRole.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });
  }

  // ==================== 用户角色管理 ====================

  async getUserRoles(userId: string) {
    const userRoles = await this.prisma.sysUserRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });
    return userRoles.map((ur) => ur.role);
  }

  async assignRoleToUser(dto: AssignRoleToUserDto) {
    return this.prisma.sysUserRole.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        roleId: dto.roleId,
      },
    });
  }

  // ==================== 权限查询 ====================

  /**
   * 获取用户权限
   * 结合拓扑图计算用户的最终权限
   */
  async getUserPermissions(userId: string) {
    // 1. 获取用户的所有角色
    const roles = await this.getUserRoles(userId);

    // 2. 对每个角色，通过拓扑图计算权限
    // TODO: 调用 VisService 的权限计算引擎

    return {
      userId,
      roles,
      permissions: [],
      message: '权限计算引擎开发中...',
    };
  }
}
