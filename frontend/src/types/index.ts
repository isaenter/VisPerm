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

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface ResourceMeta {
  resourceCode: string;
  name: string;
  fields: Array<{ name: string; type: string; label?: string }>;
}
