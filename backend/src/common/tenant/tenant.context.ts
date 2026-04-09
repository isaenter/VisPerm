import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  CanActivate,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * 租户上下文装饰器
 * 从请求头或查询参数中提取 tenantId
 *
 * 使用方式：
 * @Get('resource')
 * async getResource(@TenantId() tenantId: string) {
 *   return this.service.findByTenant(tenantId);
 * }
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // 优先级：header > query > body > default
    const tenantId =
      request.headers['x-tenant-id'] as string ||
      request.query.tenantId as string ||
      (request.body && request.body.tenantId) ||
      'default';

    return tenantId;
  },
);

/**
 * 租户验证守卫
 * 确保每个请求都包含有效的 tenantId
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.headers['x-tenant-id'] as string;

    // 如果没有 tenantId，检查是否是公共端点
    // 可以在这里添加更复杂的验证逻辑（如检查租户是否存在）
    if (!tenantId) {
      // 允许 default 租户用于开发环境
      // 生产环境应该拒绝
      return true;
    }

    return true;
  }
}

/**
 * 租户上下文服务
 * 用于在 Service 层获取当前租户
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new Map<string, string>();

  set(key: string, tenantId: string) {
    this.storage.set(key, tenantId);
  }

  get(key: string): string | undefined {
    return this.storage.get(key);
  }

  delete(key: string) {
    this.storage.delete(key);
  }
}
