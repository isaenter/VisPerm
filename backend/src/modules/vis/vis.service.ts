import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto, UpdateEdgeDto } from './dto/edge.dto';

/**
 * 可视化拓扑服务
 * 处理画布节点和连线的业务逻辑
 */
@Injectable()
export class VisService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== 节点 CRUD ====================

  async findAllNodes() {
    return this.prisma.visNode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findNodeById(id: string) {
    return this.prisma.visNode.findUnique({
      where: { id },
      include: {
        outgoingEdges: {
          include: { targetNode: true },
        },
        incomingEdges: {
          include: { sourceNode: true },
        },
      },
    });
  }

  async createNode(dto: CreateNodeDto) {
    return this.prisma.visNode.create({
      data: {
        type: dto.type,
        name: dto.name,
        code: dto.code,
        positionX: dto.positionX ?? 0,
        positionY: dto.positionY ?? 0,
        config: dto.config ?? {},
      },
    });
  }

  async updateNode(id: string, dto: UpdateNodeDto) {
    return this.prisma.visNode.update({
      where: { id },
      data: {
        name: dto.name,
        positionX: dto.positionX,
        positionY: dto.positionY,
        config: dto.config,
      },
    });
  }

  async deleteNode(id: string) {
    // 先删除关联的连线
    await this.prisma.visEdge.deleteMany({
      where: {
        OR: [{ sourceNodeId: id }, { targetNodeId: id }],
      },
    });
    return this.prisma.visNode.delete({
      where: { id },
    });
  }

  // ==================== 连线 CRUD ====================

  async findAllEdges() {
    return this.prisma.visEdge.findMany({
      include: {
        sourceNode: true,
        targetNode: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEdge(dto: CreateEdgeDto) {
    // 验证连线合法性
    const validation = this.validateEdgeConnection(dto.sourceNodeId, dto.targetNodeId, dto.type);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    return this.prisma.visEdge.create({
      data: {
        sourceNodeId: dto.sourceNodeId,
        targetNodeId: dto.targetNodeId,
        type: dto.type,
        config: dto.config ?? {},
      },
      include: {
        sourceNode: true,
        targetNode: true,
      },
    });
  }

  async updateEdge(id: string, dto: UpdateEdgeDto) {
    return this.prisma.visEdge.update({
      where: { id },
      data: {
        type: dto.type,
        config: dto.config,
      },
      include: {
        sourceNode: true,
        targetNode: true,
      },
    });
  }

  async deleteEdge(id: string) {
    return this.prisma.visEdge.delete({
      where: { id },
    });
  }

  // ==================== 拓扑验证 ====================

  /**
   * 验证连线合法性
   * 规则：
   * - RESOURCE -> FILTER -> ROLE (数据流向)
   * - ADDON -> ROLE (增量包只能连向角色)
   * - 禁止 ROLE -> RESOURCE 等反向连接
   */
  private validateEdgeConnection(
    sourceId: string,
    targetId: string,
    edgeType: string,
  ): { valid: boolean; reason?: string } {
    // 实际实现中需要查询节点类型
    // 这里先返回通过，待后续完善
    return { valid: true };
  }

  /**
   * 验证拓扑图是否有环路
   */
  async validateTopology(nodes: any[], edges: any[]): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 构建邻接表
    const graph = new Map<string, string[]>();
    for (const edge of edges) {
      if (!graph.has(edge.sourceNodeId)) {
        graph.set(edge.sourceNodeId, []);
      }
      graph.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }

    // DFS 检测环路
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    // 检查所有节点
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          issues.push('检测到环路，请检查连线配置');
          break;
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  // ==================== 权限计算 ====================

  /**
   * 计算指定角色的权限
   * 通过图遍历算法从角色节点反向遍历至资源节点
   */
  async calculatePermissionsForRole(roleId: string) {
    // TODO: 实现图遍历权限计算算法
    // 1. 找到角色节点
    // 2. DFS/BFS 反向遍历所有连线和节点
    // 3. 根据连线类型（INHERITANCE/NARROWING/EXTENSION/DENY）聚合权限
    // 4. 应用过滤器规则
    // 5. 返回最终权限结果

    return {
      roleId,
      resources: [],
      filters: [],
      message: '权限计算引擎开发中...',
    };
  }
}
