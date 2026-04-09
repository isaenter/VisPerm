import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto, UpdateEdgeDto } from './dto/edge.dto';
import { CreateTopologyDto, UpdateTopologyDto } from './dto/topology.dto';
import { SimulationRunDto } from './dto/simulation.dto';

/**
 * 可视化拓扑服务
 * 处理画布节点和连线的业务逻辑
 */
@Injectable()
export class VisService {
  // 添加日志记录器，用于记录异常
  private readonly logger = new Logger(VisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

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
    const node = await this.prisma.visNode.create({
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
    // 记录审计日志
    this.auditService.logAction(dto.tenantId, 'CREATE', 'node', node.id, undefined, { name: node.name, type: node.type });
    // 节点变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return node;
  }

  /**
   * 更新节点
   * 修复：添加 tenantId 过滤，防止 IDOR 越权
   */
  async updateNode(id: string, dto: UpdateNodeDto, tenantId: string) {
    const node = await this.prisma.visNode.update({
      where: { id, tenantId },
      data: {
        name: dto.name,
        positionX: dto.positionX,
        positionY: dto.positionY,
        config: dto.config,
      },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'UPDATE', 'node', id, undefined, { ...dto });
    // 节点变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return node;
  }

  /**
   * 删除节点
   * 修复：添加 tenantId 过滤，防止 IDOR 越权
   */
  async deleteNode(id: string, tenantId: string) {
    const node = await this.prisma.visNode.findUnique({ where: { id, tenantId } });
    // 先删除关联的连线（仅限当前租户）
    await this.prisma.visEdge.deleteMany({
      where: {
        tenantId,
        OR: [{ sourceNodeId: id }, { targetNodeId: id }],
      },
    });
    const result = await this.prisma.visNode.delete({
      where: { id, tenantId },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'DELETE', 'node', id, undefined, { name: node?.name });
    // 节点变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return result;
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
    const validation = await this.validateEdgeConnection(dto.sourceNodeId, dto.targetNodeId, dto.type, dto.tenantId);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const edge = await this.prisma.visEdge.create({
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
    // 记录审计日志
    this.auditService.logAction(dto.tenantId, 'CREATE', 'edge', edge.id, undefined, { type: edge.type });
    // 边变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return edge;
  }

  /**
   * 更新连线
   * 修复：添加 tenantId 过滤，防止 IDOR 越权
   */
  async updateEdge(id: string, dto: UpdateEdgeDto, tenantId: string) {
    const edge = await this.prisma.visEdge.update({
      where: { id, tenantId },
      data: {
        type: dto.type,
        config: dto.config,
      },
      include: {
        sourceNode: true,
        targetNode: true,
      },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'UPDATE', 'edge', id, undefined, { type: dto.type });
    // 边变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return edge;
  }

  /**
   * 删除连线
   * 修复：添加 tenantId 过滤，防止 IDOR 越权
   */
  async deleteEdge(id: string, tenantId: string) {
    const edge = await this.prisma.visEdge.findUnique({ where: { id, tenantId } });
    const result = await this.prisma.visEdge.delete({
      where: { id, tenantId },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'DELETE', 'edge', id, undefined, { type: edge?.type });
    // 边变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return result;
  }

  // ==================== 拓扑验证 ====================

  /**
   * 验证连线合法性
   * 规则：
   * - RESOURCE -> FILTER -> ROLE (数据流向)
   * - ADDON -> ROLE (增量包只能连向角色)
   * - 禁止 ROLE -> RESOURCE 等反向连接
   * 
   * 修复：添加 tenantId 参数，验证源节点和目标节点属于同一租户
   */
  async validateEdgeConnection(
    sourceId: string,
    targetId: string,
    edgeType: string,
    tenantId?: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // 构建查询条件：如果提供了 tenantId，则加入过滤
    const whereClause = tenantId ? { id: sourceId, tenantId } : { id: sourceId };
    const targetWhereClause = tenantId ? { id: targetId, tenantId } : { id: targetId };

    // 查询源节点和目标节点
    const [sourceNode, targetNode] = await Promise.all([
      this.prisma.visNode.findUnique({ where: whereClause, select: { type: true, tenantId: true } }),
      this.prisma.visNode.findUnique({ where: targetWhereClause, select: { type: true, tenantId: true } }),
    ]);

    if (!sourceNode || !targetNode) {
      return { valid: false, reason: '源节点或目标节点不存在' };
    }

    // 修复：验证源节点和目标节点属于同一租户（防止跨租户连线）
    if (sourceNode.tenantId !== targetNode.tenantId) {
      return { valid: false, reason: '源节点和目标节点不属于同一租户，禁止跨租户连线' };
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

    // 检查是否已存在重边（加入租户过滤）
    const existingEdge = await this.prisma.visEdge.findFirst({
      where: {
        ...(tenantId ? { tenantId } : {}),
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

  // ==================== 拓扑 CRUD ====================

  /**
   * 获取所有拓扑列表
   * 支持按租户和环境过滤
   */
  async findAllTopologies(tenantId: string, env?: string) {
    return this.prisma.visTopology.findMany({
      where: {
        tenantId,
        ...(env ? { env } : {}),
      },
      include: {
        nodes: {
          include: {
            outgoingEdges: { include: { targetNode: true } },
            incomingEdges: { include: { sourceNode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据 ID 获取拓扑详情
   */
  async findTopologyById(id: string, tenantId: string) {
    return this.prisma.visTopology.findUnique({
      where: { id, tenantId },
      include: {
        nodes: {
          include: {
            outgoingEdges: { include: { targetNode: true } },
            incomingEdges: { include: { sourceNode: true } },
          },
        },
      },
    });
  }

  /**
   * 创建拓扑
   */
  async createTopology(dto: CreateTopologyDto) {
    const topology = await this.prisma.visTopology.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        env: dto.env ?? 'prod',
      },
    });
    // 记录审计日志
    this.auditService.logAction(dto.tenantId, 'CREATE', 'topology', topology.id, undefined, { name: topology.name });
    return topology;
  }

  /**
   * 更新拓扑
   * 使用乐观锁机制（version 字段）防止并发覆盖
   * 修复：添加 tenantId 过滤
   */
  async updateTopology(id: string, dto: UpdateTopologyDto, tenantId: string) {
    const { version, ...updateData } = dto;
    const topology = await this.prisma.visTopology.update({
      where: {
        id,
        tenantId,
        ...(version ? { version } : {}),
      },
      data: updateData,
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'UPDATE', 'topology', id, undefined, { ...updateData });
    return topology;
  }

  /**
   * 删除拓扑
   * 同时删除关联的节点（级联删除）
   * 修复：添加 tenantId 过滤，防止 IDOR 越权
   */
  async deleteTopology(id: string, tenantId: string) {
    // 先获取拓扑以确认存在（必须包含租户过滤）
    const topology = await this.prisma.visTopology.findUnique({
      where: { id, tenantId },
      include: { nodes: { select: { id: true } } },
    });

    if (!topology) {
      throw new NotFoundException(`拓扑 ${id} 不存在`);
    }

    // 删除关联的连线（仅限当前租户）
    if (topology.nodes.length > 0) {
      const nodeIds = topology.nodes.map(n => n.id);
      await this.prisma.visEdge.deleteMany({
        where: {
          tenantId,
          OR: [
            { sourceNodeId: { in: nodeIds } },
            { targetNodeId: { in: nodeIds } },
          ],
        },
      });
    }

    // 删除拓扑及其节点
    const result = await this.prisma.visTopology.delete({
      where: { id, tenantId },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'DELETE', 'topology', id, undefined, { name: topology.name, nodeCount: topology.nodes.length });
    // 拓扑变更时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return result;
  }

  /**
   * 发布拓扑
   * 将状态更新为 published，并递增版本号
   * 修复：添加 tenantId 过滤
   */
  async publishTopology(id: string, version: number, tenantId: string) {
    const topology = await this.prisma.visTopology.update({
      where: { id, version, tenantId },
      data: {
        status: 'published',
        version: { increment: 1 },
      },
    });
    // 记录审计日志
    this.auditService.logAction(tenantId, 'PUBLISH', 'topology', id, undefined, { name: topology.name, version });
    // 发布时清除相关权限缓存
    this.cacheService.clearPattern('perm:*');
    return topology;
  }

  // ==================== 权限计算 ====================

  /**
   * 计算指定角色的权限
   * 通过图遍历算法从角色节点反向遍历至资源节点
   * 
   * 区分不同 EdgeType 的计算逻辑：
   * - INHERITANCE (继承): 权限并集 (UNION) - 取所有路径的资源合集
   * - NARROWING (收窄): 权限交集 (INTERSECTION) - 仅保留同时存在于收窄路径和继承路径的资源
   * - EXTENSION (扩展): 权限追加 (APPEND) - 在已有权限基础上追加额外资源
   * - DENY (排除): 权限剔除 (EXCLUSION) - 从最终结果中剔除被排除的资源
   * 
   * 集成 Redis 缓存：key = `perm:{roleId}:{tenantId}`, TTL = 300s
   */
  async calculatePermissionsForRole(roleId: string, tenantId: string, env?: string) {
    // 尝试从缓存读取
    const cacheKey = `perm:${roleId}:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // 缓存解析失败，继续从数据库计算
      }
    }

    // 1. 找到角色节点（已有 tenantId 过滤）
    const roleNode = await this.prisma.visNode.findFirst({
      where: { code: roleId, tenantId, type: 'ROLE', ...(env ? { env } : {}) },
    });

    if (!roleNode) {
      return {
        roleId,
        resources: [],
        filters: [],
        deniedResources: [],
        message: '角色节点不存在',
      };
    }

    // 2. 执行增强版 DFS 遍历，按 EdgeType 分类收集资源
    const result = await this.dfsCalculatePermissions(roleNode.id, tenantId);

    // 3. 根据 EdgeType 合并权限
    const mergedPermissions = this.mergePermissionsByEdgeType(result);

    const response = {
      roleId,
      resources: mergedPermissions.grantedResources,
      deniedResources: mergedPermissions.deniedResources,
      filters: mergedPermissions.filters,
      paths: result.paths,
      message: '权限计算完成',
    };

    // 将结果写入缓存（TTL 300s）
    try {
      await this.cacheService.set(cacheKey, JSON.stringify(response), 300);
    } catch {
      // 缓存写入失败不应阻断主流程
    }

    return response;
  }

  /**
   * 增强版 DFS 遍历：按 EdgeType 分类收集资源和过滤器
   * 返回分类后的原始数据，供后续合并使用
   * 修复：所有数据库查询都包含 tenantId 过滤，防止越权
   */
  private async dfsCalculatePermissions(startNodeId: string, tenantId: string) {
    const visited = new Set<string>();
    // 按 EdgeType 分类收集资源
    const resourcesByType = {
      INHERITANCE: new Set<string>(),
      NARROWING: new Set<string>(),
      EXTENSION: new Set<string>(),
      DENY: new Set<string>(),
    };
    // 按 EdgeType 分类收集过滤器
    const filtersByType = {
      INHERITANCE: [] as { expr: string; nodeId: string }[],
      NARROWING: [] as { expr: string; nodeId: string }[],
      EXTENSION: [] as { expr: string; nodeId: string }[],
      DENY: [] as { expr: string; nodeId: string }[],
    };
    const paths: { nodeId: string; type: string; edgeType?: string }[] = [];

    const dfs = async (nodeId: string, incomingEdgeType?: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // 修复：查询节点时必须加入 tenantId 过滤
      const node = await this.prisma.visNode.findUnique({
        where: { id: nodeId, tenantId },
        include: {
          incomingEdges: {
            where: { tenantId }, // 修复：查询入边时也必须加入 tenantId 过滤
            include: { sourceNode: true },
          },
        },
      });

      if (!node) return;

      // 记录当前节点的有效 EdgeType（若为根节点则默认为 INHERITANCE）
      const effectiveEdgeType = (incomingEdgeType as keyof typeof resourcesByType) || 'INHERITANCE';
      paths.push({ nodeId: node.id, type: node.type, edgeType: incomingEdgeType });

      // 收集资源 - 按到达该资源的边的类型分类
      if (node.type === 'RESOURCE') {
        const resourceCode = node.code || node.name;
        resourcesByType[effectiveEdgeType].add(resourceCode);
      }

      // 收集过滤器 - 按边的类型分类
      if (node.type === 'FILTER' && node.config) {
        const config = node.config as any;
        if (config.expression) {
          filtersByType[effectiveEdgeType].push({
            expr: config.expression,
            nodeId: node.id,
          });
        }
      }

      // 继续遍历入边
      for (const edge of node.incomingEdges || []) {
        await dfs(edge.sourceNode.id, edge.type);
      }
    };

    await dfs(startNodeId);

    return {
      resourcesByType,
      filtersByType,
      paths,
    };
  }

  /**
   * 按 EdgeType 合并权限
   * 
   * 合并策略：
   * 1. 以 INHERITANCE 资源为基础集合
   * 2. 若存在 NARROWING 资源，则取交集（收窄权限范围）
   * 3. 追加 EXTENSION 资源（扩展权限）
   * 4. 剔除 DENY 资源（排除权限）
   */
  private mergePermissionsByEdgeType(data: {
    resourcesByType: Record<string, Set<string>>;
    filtersByType: Record<string, { expr: string; nodeId: string }[]>;
    paths: { nodeId: string; type: string; edgeType?: string }[];
  }) {
    const { INHERITANCE, NARROWING, EXTENSION, DENY } = data.resourcesByType;

    // 步骤1: 以继承(INHERITANCE)资源为基础
    let grantedResources = new Set<string>(INHERITANCE);

    // 步骤2: 如果存在收窄(NARROWING)资源，取交集
    // 收窄逻辑：仅保留同时存在于继承集合和收窄集合中的资源
    if (NARROWING.size > 0) {
      if (grantedResources.size > 0) {
        // 有继承资源，取交集
        grantedResources = new Set(
          [...grantedResources].filter(r => NARROWING.has(r))
        );
      } else {
        // 无继承资源时，收窄资源直接作为基础
        grantedResources = new Set(NARROWING);
      }
    }

    // 步骤3: 追加扩展(EXTENSION)资源
    // 扩展逻辑：在已有权限基础上追加额外资源
    for (const resource of EXTENSION) {
      grantedResources.add(resource);
    }

    // 步骤4: 剔除排除(DENY)资源
    // 排除逻辑：从最终结果中移除被排除的资源
    const deniedResources = new Set<string>(DENY);
    for (const resource of DENY) {
      grantedResources.delete(resource);
    }

    // 合并所有过滤器表达式
    const allFilters = [
      ...data.filtersByType.INHERITANCE,
      ...data.filtersByType.NARROWING,
      ...data.filtersByType.EXTENSION,
    ];
    const filterExpression = this.mergeFiltersV2(allFilters, data.filtersByType);

    return {
      grantedResources: Array.from(grantedResources),
      deniedResources: Array.from(deniedResources),
      filters: filterExpression ? [filterExpression] : [],
    };
  }

  /**
   * 合并过滤器表达式（增强版，支持按优先级排序）
   * 优先级：NARROWING(AND) > INHERITANCE(OR) > EXTENSION(OR)
   */
  private mergeFiltersV2(
    allFilters: { expr: string; nodeId: string }[],
    filtersByType: Record<string, { expr: string; nodeId: string }[]>
  ): string {
    if (allFilters.length === 0) return '';

    const byPriority = {
      narrowing: filtersByType.NARROWING.map(f => f.expr),
      inheritance: filtersByType.INHERITANCE.map(f => f.expr),
      extension: filtersByType.EXTENSION.map(f => f.expr),
    };

    const exprs: string[] = [];

    // 收窄过滤器优先级最高，使用 AND 连接（进一步限制范围）
    if (byPriority.narrowing.length > 0) {
      exprs.push(`(${byPriority.narrowing.join(' AND ')})`);
    }

    // 继承过滤器，使用 OR 连接
    if (byPriority.inheritance.length > 0) {
      exprs.push(`(${byPriority.inheritance.join(' OR ')})`);
    }

    // 扩展过滤器，使用 OR 连接
    if (byPriority.extension.length > 0) {
      exprs.push(`(${byPriority.extension.join(' OR ')})`);
    }

    return exprs.join(' AND ');
  }

  /**
   * 合并过滤器表达式（保留旧版兼容）
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

  // ==================== 模拟运行 API ====================

  /**
   * 模拟运行：在不修改数据库的情况下计算权限
   * 支持传入多个角色 ID 或用户 ID，返回模拟计算出的最终权限结构
   * 
   * @param dto 模拟运行参数
   * @param tenantId 租户 ID（从请求头获取）
   * @returns 模拟权限结果
   */
  async runSimulation(dto: SimulationRunDto, tenantId: string) {
    const { roleIds = [], userIds = [], dryRun = true, env } = dto;
    const targetEnv = env || 'prod';

    // 结果汇总
    const results: {
      sourceType: 'role' | 'user';
      sourceId: string;
      grantedResources: string[];
      deniedResources: string[];
      filters: string[];
      computedAt: string;
    }[] = [];

    const errors: { sourceType: string; sourceId: string; error: string }[] = [];

    // 1. 处理角色 ID 集合
    for (const roleId of roleIds) {
      try {
        const permResult = await this.calculatePermissionsForRole(roleId, tenantId, targetEnv);
        results.push({
          sourceType: 'role',
          sourceId: roleId,
          grantedResources: permResult.resources || [],
          deniedResources: permResult.deniedResources || [],
          filters: permResult.filters || [],
          computedAt: new Date().toISOString(),
        });
      } catch (e) {
        errors.push({
          sourceType: 'role',
          sourceId: roleId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // 2. 处理用户 ID 集合（需要先查询用户关联的角色）
    for (const userId of userIds) {
      try {
        // 查询用户关联的所有角色
        const userRoles = await this.prisma.sysUserRole.findMany({
          where: { userId, tenantId },
          include: { role: true },
        });

        if (userRoles.length === 0) {
          errors.push({
            sourceType: 'user',
            sourceId: userId,
            error: '用户未关联任何角色',
          });
          continue;
        }

        // 汇总用户所有角色的权限（多个角色的权限取并集）
        const allGrantedResources = new Set<string>();
        const allDeniedResources = new Set<string>();
        const allFilters: string[] = [];
        const roleDetails: { roleId: string; granted: string[]; denied: string[] }[] = [];

        for (const userRole of userRoles) {
          const roleCode = userRole.role.code;
          const permResult = await this.calculatePermissionsForRole(roleCode, tenantId, targetEnv);

          // 用户多角色权限合并：资源取并集
          for (const r of permResult.resources || []) {
            allGrantedResources.add(r);
          }
          // 排除资源取并集（任一角色排除则排除）
          for (const r of permResult.deniedResources || []) {
            allDeniedResources.add(r);
          }
          for (const f of permResult.filters || []) {
            allFilters.push(f);
          }

          roleDetails.push({
            roleId: roleCode,
            granted: permResult.resources || [],
            denied: permResult.deniedResources || [],
          });
        }

        // 从授权资源中剔除排除资源
        for (const r of allDeniedResources) {
          allGrantedResources.delete(r);
        }

        results.push({
          sourceType: 'user',
          sourceId: userId,
          grantedResources: Array.from(allGrantedResources),
          deniedResources: Array.from(allDeniedResources),
          filters: allFilters,
          computedAt: new Date().toISOString(),
        });
      } catch (e) {
        errors.push({
          sourceType: 'user',
          sourceId: userId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return {
      dryRun,
      tenantId,
      env: targetEnv,
      totalGranted: results.reduce((sum, r) => sum + r.grantedResources.length, 0),
      totalDenied: results.reduce((sum, r) => sum + r.deniedResources.length, 0),
      results,
      errors,
      computedAt: new Date().toISOString(),
    };
  }

  // ==================== 快照管理 ====================

  /**
   * 创建当前拓扑快照
   * 序列化指定拓扑的所有节点和边为 JSON，保存为快照记录
   */
  async createSnapshot(topologyId: string, tenantId: string) {
    // 验证拓扑存在
    const topology = await this.prisma.visTopology.findUnique({
      where: { id: topologyId, tenantId },
    });
    if (!topology) {
      throw new NotFoundException(`拓扑 ${topologyId} 不存在`);
    }

    // 查询拓扑下所有节点和边
    const [nodes, edges] = await Promise.all([
      this.prisma.visNode.findMany({
        where: { tenantId, topologyId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.visEdge.findMany({
        where: { tenantId },
        include: {
          sourceNode: { select: { id: true } },
          targetNode: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 获取当前最大版本号
    const latestSnapshot = await this.prisma.visSnapshot.findFirst({
      where: { tenantId, topologyId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestSnapshot?.version ?? 0) + 1;

    // 序列化快照数据
    const snapshotData = {
      topology: {
        id: topology.id,
        name: topology.name,
        description: topology.description,
        env: topology.env,
      },
      nodes,
      edges: edges.map(e => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        type: e.type,
        config: e.config,
      })),
    };

    const snapshot = await this.prisma.visSnapshot.create({
      data: {
        tenantId,
        topologyId,
        version: nextVersion,
        snapshot: snapshotData as any,
      },
    });

    // 记录审计日志
    this.auditService.logAction(
      tenantId,
      'CREATE',
      'snapshot',
      snapshot.id,
      undefined,
      { topologyId, version: nextVersion, nodeCount: nodes.length, edgeCount: edges.length },
    );

    return {
      ...snapshot,
      snapshot: snapshotData,
    };
  }

  /**
   * 获取快照列表
   */
  async findAllSnapshots(tenantId: string) {
    return this.prisma.visSnapshot.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取快照详情
   */
  async findSnapshotById(id: string, tenantId: string) {
    const snapshot = await this.prisma.visSnapshot.findUnique({
      where: { id, tenantId },
    });
    if (!snapshot) return null;
    return {
      ...snapshot,
      snapshot: snapshot.snapshot as any,
    };
  }

  /**
   * 回滚到指定快照
   * 删除当前拓扑所有节点和边，恢复快照中的数据
   */
  async rollbackSnapshot(snapshotId: string, tenantId: string) {
    const snapshot = await this.prisma.visSnapshot.findUnique({
      where: { id: snapshotId, tenantId },
    });
    if (!snapshot) {
      throw new NotFoundException(`快照 ${snapshotId} 不存在`);
    }

    const snapshotData = snapshot.snapshot as any;
    const topologyId = snapshot.topologyId;

    // 使用事务保证原子性
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 删除当前拓扑下所有节点的边
      const currentNodes = await tx.visNode.findMany({
        where: { tenantId, topologyId },
        select: { id: true },
      });
      if (currentNodes.length > 0) {
        const nodeIds = currentNodes.map(n => n.id);
        await tx.visEdge.deleteMany({
          where: {
            tenantId,
            OR: [
              { sourceNodeId: { in: nodeIds } },
              { targetNodeId: { in: nodeIds } },
            ],
          },
        });
      }

      // 2. 删除当前拓扑下所有节点
      await tx.visNode.deleteMany({
        where: { tenantId, topologyId },
      });

      // 3. 恢复快照中的节点（不指定 ID，由数据库生成新 ID）
      const nodeIdMap = new Map<string, string>();
      if (snapshotData.nodes && Array.isArray(snapshotData.nodes)) {
        for (const node of snapshotData.nodes) {
          const newNode = await tx.visNode.create({
            data: {
              tenantId,
              topologyId,
              type: node.type,
              name: node.name,
              code: node.code ?? null,
              positionX: node.positionX ?? 0,
              positionY: node.positionY ?? 0,
              config: (node.config ?? {}) as any,
            },
          });
          // 记录旧 ID 到新 ID 的映射
          nodeIdMap.set(node.id, newNode.id);
        }
      }

      // 4. 恢复快照中的边（使用新的节点 ID）
      if (snapshotData.edges && Array.isArray(snapshotData.edges)) {
        for (const edge of snapshotData.edges) {
          const newSourceId = nodeIdMap.get(edge.sourceNodeId);
          const newTargetId = nodeIdMap.get(edge.targetNodeId);
          if (newSourceId && newTargetId) {
            await tx.visEdge.create({
              data: {
                tenantId,
                sourceNodeId: newSourceId,
                targetNodeId: newTargetId,
                type: edge.type,
                config: (edge.config ?? {}) as any,
              },
            });
          }
        }
      }

      return { restoredNodeCount: nodeIdMap.size };
    });

    // 记录审计日志
    this.auditService.logAction(
      tenantId,
      'ROLLBACK',
      'snapshot',
      snapshotId,
      undefined,
      { topologyId, version: snapshot.version, restoredNodeCount: result.restoredNodeCount },
    );

    // 回滚后清除相关权限缓存
    this.cacheService.clearPattern('perm:*');

    return {
      message: '回滚成功',
      snapshotId,
      version: snapshot.version,
      ...result,
    };
  }
}
