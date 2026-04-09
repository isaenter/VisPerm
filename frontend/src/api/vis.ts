import apiClient from './request';

export interface VisNode {
  id: string;
  type: 'RESOURCE' | 'ROLE' | 'FILTER' | 'ADDON';
  name: string;
  code?: string;
  positionX?: number;
  positionY?: number;
  config?: any;
}

export interface VisEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'INHERITANCE' | 'NARROWING' | 'EXTENSION' | 'DENY';
  config?: any;
}

/**
 * 获取所有节点
 */
export const getNodes = () => {
  return apiClient.get<VisNode[]>('/vis/nodes');
};

/**
 * 获取单个节点
 */
export const getNode = (id: string) => {
  return apiClient.get<VisNode>(`/vis/nodes/${id}`);
};

/**
 * 创建节点
 */
export const createNode = (data: Partial<VisNode>) => {
  return apiClient.post<VisNode>('/vis/nodes', data);
};

/**
 * 更新节点
 */
export const updateNode = (id: string, data: Partial<VisNode>) => {
  return apiClient.put<VisNode>(`/vis/nodes/${id}`, data);
};

/**
 * 删除节点
 */
export const deleteNode = (id: string) => {
  return apiClient.delete(`/vis/nodes/${id}`);
};

/**
 * 获取所有连线
 */
export const getEdges = () => {
  return apiClient.get<VisEdge[]>('/vis/edges');
};

/**
 * 创建连线
 */
export const createEdge = (data: Partial<VisEdge>) => {
  return apiClient.post<VisEdge>('/vis/edges', data);
};

/**
 * 更新连线
 */
export const updateEdge = (id: string, data: Partial<VisEdge>) => {
  return apiClient.put<VisEdge>(`/vis/edges/${id}`, data);
};

/**
 * 删除连线
 */
export const deleteEdge = (id: string) => {
  return apiClient.delete(`/vis/edges/${id}`);
};

/**
 * 计算角色权限
 */
export const calculatePermissions = (roleId: string) => {
  return apiClient.get(`/vis/graph/${roleId}/calculate`);
};

/**
 * 验证拓扑图
 */
export const validateGraph = (nodes: VisNode[], edges: VisEdge[]) => {
  return apiClient.post('/vis/graph/validate', { nodes, edges });
};
