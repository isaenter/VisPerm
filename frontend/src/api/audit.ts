import apiClient from './request';

/** 审计日志查询参数 */
export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  resource?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
}

/** 审计日志记录 */
export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  detail: Record<string, any>;
  createdAt: string;
}

/** 审计日志分页响应 */
export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取审计日志列表（支持分页和过滤）
 */
export const getAuditLogs = (params: AuditLogQuery = {}) => {
  return apiClient.get<AuditLogResponse>('/audit-logs', { params });
};
