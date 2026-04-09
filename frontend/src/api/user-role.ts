import apiClient from './request';

/** 用户角色记录 */
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  roleName?: string;
  assignedAt?: string;
}

/** 分配角色参数 */
export interface AssignRoleParams {
  userId: string;
  roleIds: string[];
}

/**
 * 获取指定用户的角色列表
 */
export const getUserRoles = (userId: string) => {
  return apiClient.get<UserRole[]>(`/user-roles/user/${userId}`);
};

/**
 * 批量分配角色给用户
 */
export const assignRole = (data: AssignRoleParams) => {
  return apiClient.post<UserRole[]>('/user-roles', data);
};

/**
 * 移除用户的某个角色
 */
export const removeUserRole = (id: string) => {
  return apiClient.delete(`/user-roles/${id}`);
};
