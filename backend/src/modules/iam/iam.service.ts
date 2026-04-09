import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
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
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
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
    const role = await this.prisma.sysRole.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });
    // 记录审计日志
    this.auditService.logAction(dto.tenantId, 'CREATE', 'role', role.id, undefined, { name: role.name, code: role.code });
    return role;
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
    const userRole = await this.prisma.sysUserRole.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        roleId: dto.roleId,
      },
    });
    // 记录审计日志
    this.auditService.logAction(dto.tenantId, 'CREATE', 'user-role', userRole.id, dto.userId, { roleId: dto.roleId });
    // 用户角色变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return userRole;
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
        // 将 DTO 数组转换为纯 JSON 对象以兼容 Prisma
        fields: dto.fields.map(f => ({ name: f.name, type: f.type, label: f.label })) as any,
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
        // 将 DTO 数组转换为纯 JSON 对象以兼容 Prisma
        fields: dto.fields ? (dto.fields.map(f => ({ name: f.name, type: f.type, label: f.label })) as any) : undefined,
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

    const result = await this.prisma.sysResourceMeta.delete({
      where: { tenantId_resourceCode: { tenantId, resourceCode } },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'DELETE', 'resource-meta', resourceCode, undefined, { resourceCode });
    return result;
  }

  // ==================== 用户角色管理扩展 ====================

  /**
   * 查询用户角色关联列表（支持按租户过滤）
   */
  async findAllUserRoles(tenantId: string) {
    return this.prisma.sysUserRole.findMany({
      where: { tenantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 批量分配角色给用户
   */
  async batchAssignRoles(dto: { userId: string; roleIds: string[]; tenantId: string }) {
    const results: any[] = [];
    for (const roleId of dto.roleIds) {
      try {
        const userRole = await this.prisma.sysUserRole.create({
          data: {
            tenantId: dto.tenantId,
            userId: dto.userId,
            roleId,
          },
          include: { role: true },
        });
        results.push(userRole);
        // 记录审计日志
        this.auditService.logAction(dto.tenantId, 'CREATE', 'user-role', userRole.id, dto.userId, { roleId });
      } catch (error) {
        // 跳过已存在的关联
        if ((error as any).code === 'P2002') {
          continue;
        }
        throw error;
      }
    }
    // 批量分配后清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return results;
  }

  /**
   * 移除用户角色
   */
  async removeUserRole(id: string, tenantId: string) {
    const userRole = await this.prisma.sysUserRole.findUnique({
      where: { id, tenantId },
    });

    if (!userRole) {
      throw new NotFoundException(`用户角色关联 ${id} 不存在`);
    }

    const result = await this.prisma.sysUserRole.delete({
      where: { id, tenantId },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'DELETE', 'user-role', id, userRole.userId, { roleId: userRole.roleId });
    // 用户角色变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return result;
  }

  /**
   * 查询指定用户的角色（带角色详情）
   */
  async findUserRolesWithDetails(userId: string, tenantId: string) {
    return this.prisma.sysUserRole.findMany({
      where: { userId, tenantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
