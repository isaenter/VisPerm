import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';
import { CreateResourceMetaDto, UpdateResourceMetaDto } from './dto/resource-meta.dto';
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

  // ==================== 资源元数据管理 ====================

  /**
   * 获取所有资源元数据列表
   * 支持按租户过滤
   */
  async findAllResourceMetas(tenantId: string) {
    return this.prisma.sysResourceMeta.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据资源编码获取元数据详情
   */
  async findResourceMetaByCode(resourceCode: string, tenantId: string) {
    return this.prisma.sysResourceMeta.findUnique({
      where: { tenantId_resourceCode: { tenantId, resourceCode } },
    });
  }

  /**
   * 创建资源元数据
   */
  async createResourceMeta(dto: CreateResourceMetaDto) {
    return this.prisma.sysResourceMeta.create({
      data: {
        tenantId: dto.tenantId,
        resourceCode: dto.resourceCode,
        name: dto.name,
        fields: dto.fields,
      },
    });
  }

  /**
   * 更新资源元数据
   */
  async updateResourceMeta(resourceCode: string, tenantId: string, dto: UpdateResourceMetaDto) {
    const existing = await this.prisma.sysResourceMeta.findUnique({
      where: { tenantId_resourceCode: { tenantId, resourceCode } },
    });

    if (!existing) {
      throw new NotFoundException(`资源元数据 ${resourceCode} 不存在`);
    }

    return this.prisma.sysResourceMeta.update({
      where: { tenantId_resourceCode: { tenantId, resourceCode } },
      data: {
        name: dto.name ?? undefined,
        fields: dto.fields ?? undefined,
      },
    });
  }

  /**
   * 删除资源元数据
   */
  async deleteResourceMeta(resourceCode: string, tenantId: string) {
    const existing = await this.prisma.sysResourceMeta.findUnique({
      where: { tenantId_resourceCode: { tenantId, resourceCode } },
    });

    if (!existing) {
      throw new NotFoundException(`资源元数据 ${resourceCode} 不存在`);
    }

    return this.prisma.sysResourceMeta.delete({
      where: { tenantId_resourceCode: { tenantId, resourceCode } },
    });
  }
}
