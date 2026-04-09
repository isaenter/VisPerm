import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  CanActivate,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * 租户上下文装饰器
 * 从请求头提取 tenantId
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

    // 从请求头提取 tenantId（由 TenantGuard 确保其存在）
    const tenantId = request.headers['x-tenant-id'] as string;

    return tenantId;
  },
);

/**
 * 租户验证守卫
 * 确保每个请求都包含有效的 tenantId 请求头
 * 缺少 x-tenant-id 时将拒绝请求（401 Unauthorized）
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.headers['x-tenant-id'] as string;

    // 缺少租户 ID 时拒绝请求，禁止静默降级到默认租户
    if (!tenantId) {
      throw new UnauthorizedException('缺少必需的 x-tenant-id 请求头');
    }

    return true;
  }
}
