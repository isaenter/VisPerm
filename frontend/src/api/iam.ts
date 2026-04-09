import apiClient from './request';
import type { Role, ResourceMeta } from '@/types';

/**
 * 获取所有角色列表
 */
export const getRoles = () => {
  return apiClient.get<Role[]>('/iam/roles');
};

/**
 * 创建角色
 */
export const createRole = (data: { name: string; code: string; description?: string }) => {
  return apiClient.post<Role>('/iam/roles', data);
};

/**
 * 更新角色
 */
export const updateRole = (id: string, data: { name?: string; code?: string; description?: string }) => {
  return apiClient.put<Role>(`/iam/roles/${id}`, data);
};

/**
 * 删除角色
 */
export const deleteRole = (id: string) => {
  return apiClient.delete(`/iam/roles/${id}`);
};

/**
 * 获取所有资源元数据列表
 */
export const getResourceMetas = () => {
  return apiClient.get<ResourceMeta[]>('/iam/resources/meta');
};

/**
 * 创建资源元数据
 */
export const createResourceMeta = (data: { resourceCode: string; name: string; fields: Array<{ name: string; type: string; label?: string }> }) => {
  return apiClient.post<ResourceMeta>('/iam/resources/meta', data);
};

/**
 * 更新资源元数据
 */
export const updateResourceMeta = (resourceCode: string, data: { name?: string; fields?: Array<{ name: string; type: string; label?: string }> }) => {
  return apiClient.put<ResourceMeta>(`/iam/resources/meta/${resourceCode}`, data);
};

/**
 * 删除资源元数据
 */
export const deleteResourceMeta = (resourceCode: string) => {
  return apiClient.delete(`/iam/resources/meta/${resourceCode}`);
};

/**
 * 运行模拟权限计算
 */
export const runSimulation = (data: { roleIds?: string[]; userIds?: string[]; dryRun?: boolean; env?: string }) => {
  return apiClient.post('/vis/simulation/run', data);
};
