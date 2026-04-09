import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';
import { VisService } from '../vis/vis.service';

/**
 * IAM 权限服务
 */
@Injectable()
export class IamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visService: VisService,
  ) {}

  // ==================== 角色管理 ====================

  async findAllRoles(tenantId: string) {
    return this.prisma.sysRole.findMany({
      where: { tenantId },
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

  async getUserRoles(userId: string, tenantId: string) {
    const userRoles = await this.prisma.sysUserRole.findMany({
      where: { userId, tenantId },
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
  async getUserPermissions(userId: string, tenantId: string) {
    // 1. 获取用户的所有角色
    const roles = await this.getUserRoles(userId, tenantId);

    // 2. 对每个角色，通过拓扑图计算权限
    const allPermissions: any[] = [];
    for (const role of roles) {
      const perms = await this.visService.calculatePermissionsForRole(role.id, tenantId);
      allPermissions.push(perms);
    }

    return {
      userId,
      tenantId,
      roles,
      permissions: allPermissions,
    };
  }
}
