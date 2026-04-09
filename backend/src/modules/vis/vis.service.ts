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

  async findAllNodes(tenantId: string) {
    return this.prisma.visNode.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findNodeById(id: string, tenantId: string) {
    return this.prisma.visNode.findUnique({
      where: { id, tenantId },
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
        tenantId: dto.tenantId,
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

  async findAllEdges(tenantId: string) {
    return this.prisma.visEdge.findMany({
      where: { tenantId },
      include: {
        sourceNode: true,
        targetNode: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEdge(dto: CreateEdgeDto) {
    // 验证连线合法性
    const validation = await this.validateEdgeConnection(dto.sourceNodeId, dto.targetNodeId, dto.type);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    return this.prisma.visEdge.create({
      data: {
        tenantId: dto.tenantId,
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
  async validateEdgeConnection(
    sourceId: string,
    targetId: string,
    edgeType: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // 查询源节点和目标节点
    const [sourceNode, targetNode] = await Promise.all([
      this.prisma.visNode.findUnique({ where: { id: sourceId }, select: { type: true } }),
      this.prisma.visNode.findUnique({ where: { id: targetId }, select: { type: true } }),
    ]);

    if (!sourceNode || !targetNode) {
      return { valid: false, reason: '源节点或目标节点不存在' };
    }

    const sourceType = sourceNode.type;
    const targetType = targetNode.type;

    // 合法性规则矩阵
    const validConnections: Record<string, string[]> = {
      RESOURCE: ['FILTER'],        // 资源只能连向过滤器
      FILTER: ['ROLE', 'FILTER'],  // 过滤器可以连向角色或其他过滤器
      ADDON: ['ROLE'],             // 增量包只能连向角色
      ROLE: [],                    // 角色不能作为源节点（数据单向流动）
    };

    const allowedTargets = validConnections[sourceType] || [];
    if (!allowedTargets.includes(targetType)) {
      return {
        valid: false,
        reason: `不允许的连线：${sourceType} -> ${targetType}。允许的连接：${allowedTargets.join(', ') || '无'}`,
      };
    }

    // 检查是否已存在重边
    const existingEdge = await this.prisma.visEdge.findFirst({
      where: {
        sourceNodeId: sourceId,
        targetNodeId: targetId,
      },
    });

    if (existingEdge) {
      return { valid: false, reason: '已存在相同的连线' };
    }

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
  async calculatePermissionsForRole(roleId: string, tenantId: string) {
    // 1. 找到角色节点
    const roleNode = await this.prisma.visNode.findFirst({
      where: { code: roleId, tenantId, type: 'ROLE' },
    });

    if (!roleNode) {
      return {
        roleId,
        resources: [],
        filters: [],
        message: '角色节点不存在',
      };
    }

    // 2. DFS 反向遍历所有连线和节点
    const visited = new Set<string>();
    const resources = new Set<string>();
    const filters: { expr: string; priority: 'extension' | 'inheritance' | 'narrowing' }[] = [];
    const paths: { nodeId: string; type: string; edgeType?: string }[] = [];

    const dfs = async (nodeId: string, incomingEdgeType?: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = await this.prisma.visNode.findUnique({
        where: { id: nodeId },
        include: {
          incomingEdges: {
            include: { sourceNode: true },
          },
        },
      });

      if (!node) return;

      paths.push({ nodeId: node.id, type: node.type, edgeType: incomingEdgeType });

      // 收集资源
      if (node.type === 'RESOURCE') {
        resources.add(node.code || node.name);
      }

      // 收集过滤器
      if (node.type === 'FILTER' && node.config) {
        const config = node.config as any;
        if (config.expression) {
          filters.push({
            expr: config.expression,
            priority: incomingEdgeType === 'EXTENSION' ? 'extension' :
                      incomingEdgeType === 'NARROWING' ? 'narrowing' : 'inheritance',
          });
        }
      }

      // 继续遍历入边
      for (const edge of node.incomingEdges || []) {
        await dfs(edge.sourceNode.id, edge.type);
      }
    };

    await dfs(roleNode.id);

    // 3. 合并过滤器
    const filterExpression = this.mergeFilters(filters);

    return {
      roleId,
      resources: Array.from(resources),
      filters: filterExpression ? [filterExpression] : [],
      paths,
      message: '权限计算完成',
    };
  }

  /**
   * 合并过滤器表达式
   */
  private mergeFilters(filters: { expr: string; priority: string }[]): string {
    if (filters.length === 0) return '';

    const byPriority = {
      extension: filters.filter(f => f.priority === 'extension').map(f => f.expr),
      inheritance: filters.filter(f => f.priority === 'inheritance').map(f => f.expr),
      narrowing: filters.filter(f => f.priority === 'narrowing').map(f => f.expr),
    };

    const exprs: string[] = [];
    if (byPriority.extension.length > 0) {
      exprs.push(`(${byPriority.extension.join(' OR ')})`);
    }
    if (byPriority.inheritance.length > 0) {
      exprs.push(`(${byPriority.inheritance.join(' OR ')})`);
    }
    if (byPriority.narrowing.length > 0) {
      exprs.push(`(${byPriority.narrowing.join(' AND ')})`);
    }

    return exprs.join(' OR ');
  }
}
