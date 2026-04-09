import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 审计日志服务
 * 记录系统中所有关键操作，支持 CREATE/UPDATE/DELETE/ROLLBACK/PUBLISH
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录审计日志
   * @param tenantId 租户 ID
   * @param action 操作类型：CREATE/UPDATE/DELETE/ROLLBACK/PUBLISH
   * @param resource 资源类型：node/edge/topology/snapshot/role/user-role
   * @param resourceId 资源 ID（可选）
   * @param userId 操作用户 ID
   * @param details 操作详情（前后对比等）
   */
  async logAction(
    tenantId: string,
    action: string,
    resource: string,
    resourceId?: string,
    userId?: string,
    details?: Record<string, any>,
  ) {
    try {
      await this.prisma.visAuditLog.create({
        data: {
          tenantId,
          action,
          resource,
          resourceId: resourceId ?? null,
          userId: userId ?? 'system',
          details: (details ?? {}) as any,
        },
      });
      this.logger.log(`审计日志: ${action} ${resource} (租户: ${tenantId})`);
    } catch (error) {
      // 审计日志写入失败不应阻断主业务流程
      this.logger.error(`审计日志写入失败: ${error}`);
    }
  }

  /**
   * 分页查询审计日志
   * 支持按 action, resource, userId 过滤
   */
  async findAuditLogs(params: {
    tenantId: string;
    action?: string;
    resource?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { tenantId, action, resource, userId, page = 1, pageSize = 20 } = params;

    const where: any = {
      tenantId,
      ...(action ? { action } : {}),
      ...(resource ? { resource } : {}),
      ...(userId ? { userId } : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.visAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.visAuditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
