import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 审计日志控制器
 * 提供审计日志的分页查询，支持按操作类型、资源类型、用户 ID 过滤
 */
@ApiTags('审计日志')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: '分页查询审计日志', description: '支持按 action、resource、userId 过滤' })
  @ApiQuery({ name: 'action', required: false, description: '操作类型：CREATE/UPDATE/DELETE/ROLLBACK/PUBLISH' })
  @ApiQuery({ name: 'resource', required: false, description: '资源类型：node/edge/topology/snapshot/role/user-role' })
  @ApiQuery({ name: 'userId', required: false, description: '操作用户 ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数', type: Number })
  @ApiResponse({ status: 200, description: '成功返回审计日志列表' })
  async findAuditLogs(
    @TenantId() tenantId: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditService.findAuditLogs({
      tenantId,
      action,
      resource,
      userId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }
}
