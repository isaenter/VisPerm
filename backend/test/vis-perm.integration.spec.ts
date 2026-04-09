/**
 * VisPerm 集成测试
 * 验证节点 - 连线协同创建与权限计算的端到端流程
 */
import { Test, TestingModule } from '@nestjs/testing';
import { VisService } from '../src/modules/vis/vis.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { CacheService } from '../src/modules/cache/cache.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('VisPerm 集成测试', () => {
  let visService: VisService;
  let prisma: PrismaService;

  const mockPrismaService = {
    visNode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    visEdge: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    visTopology: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    visSnapshot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    sysUserRole: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    clearPattern: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    logAction: jest.fn().mockResolvedValue(undefined),
    findAuditLogs: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    visService = module.get<VisService>(VisService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('集成场景 1: 创建完整的权限拓扑链路', () => {
    it('应该成功创建 RESOURCE -> FILTER -> ROLE 的完整链路', async () => {
      const tenantId = 'tenant-test-001';

      // 1. 创建资源节点
      const resourceNode = {
        id: 'node-resource-1',
        tenantId,
        type: 'RESOURCE',
        name: '用户数据',
        code: 'user_data',
        positionX: 0,
        positionY: 0,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.visNode.create.mockResolvedValueOnce(resourceNode);

      // 2. 创建过滤器节点
      const filterNode = {
        id: 'node-filter-1',
        tenantId,
        type: 'FILTER',
        name: '部门过滤',
        code: 'dept_filter',
        positionX: 200,
        positionY: 0,
        config: { expression: 'department = "tech"' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.visNode.create.mockResolvedValueOnce(filterNode);

      // 3. 创建角色节点
      const roleNode = {
        id: 'node-role-1',
        tenantId,
        type: 'ROLE',
        name: '技术部经理',
        code: 'tech_manager',
        positionX: 400,
        positionY: 0,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.visNode.create.mockResolvedValueOnce(roleNode);

      // 4. 创建 RESOURCE -> FILTER 连线
      const edge1 = {
        id: 'edge-1',
        tenantId,
        sourceNodeId: 'node-resource-1',
        targetNodeId: 'node-filter-1',
        type: 'INHERITANCE',
        config: {},
        sourceNode: resourceNode,
        targetNode: filterNode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 5. 创建 FILTER -> ROLE 连线
      const edge2 = {
        id: 'edge-2',
        tenantId,
        sourceNodeId: 'node-filter-1',
        targetNodeId: 'node-role-1',
        type: 'INHERITANCE',
        config: {},
        sourceNode: filterNode,
        targetNode: roleNode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.visEdge.create
        .mockResolvedValueOnce(edge1)
        .mockResolvedValueOnce(edge2);

      // 6. 模拟 validateEdgeConnection 返回 true
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'RESOURCE' })
        .mockResolvedValueOnce({ type: 'FILTER' })
        .mockResolvedValueOnce({ type: 'FILTER' })
        .mockResolvedValueOnce({ type: 'ROLE' });

      mockPrismaService.visEdge.findFirst.mockResolvedValue(null);

      // 验证：连线创建应该成功
      const result1 = await visService.createEdge({
        tenantId,
        sourceNodeId: 'node-resource-1',
        targetNodeId: 'node-filter-1',
        type: 'INHERITANCE',
      });
      expect(result1).toEqual(edge1);

      const result2 = await visService.createEdge({
        tenantId,
        sourceNodeId: 'node-filter-1',
        targetNodeId: 'node-role-1',
        type: 'INHERITANCE',
      });
      expect(result2).toEqual(edge2);
    });
  });

  describe('集成场景 2: 权限计算端到端', () => {
    it('应该正确计算角色权限（包含资源和过滤器）', async () => {
      const tenantId = 'tenant-test-001';
      const roleId = 'tech_manager';

      // 模拟角色节点
      const roleNode = {
        id: 'node-role-1',
        tenantId,
        type: 'ROLE',
        code: roleId,
        name: '技术部经理',
      };

      // 模拟资源节点（带配置）
      const resourceNode = {
        id: 'node-resource-1',
        tenantId,
        type: 'RESOURCE',
        code: 'user_data',
        name: '用户数据',
        incomingEdges: [],
      };

      // 模拟过滤器节点（带配置）
      const filterNode = {
        id: 'node-filter-1',
        tenantId,
        type: 'FILTER',
        code: 'dept_filter',
        name: '部门过滤',
        config: { expression: 'department = "tech"' },
        incomingEdges: [
          {
            id: 'edge-1',
            type: 'INHERITANCE',
            sourceNode: resourceNode,
          },
        ],
      };

      // 模拟入边查询：先返回角色节点，再返回过滤器节点，最后返回资源节点
      mockPrismaService.visNode.findFirst.mockResolvedValue(roleNode);
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce(filterNode)
        .mockResolvedValueOnce(resourceNode);

      const result = await visService.calculatePermissionsForRole(roleId, tenantId);

      expect(result.resources).toContain('user_data');
      expect(result.filters).toHaveLength(1);
      expect(result.paths).toBeDefined();
    });
  });

  describe('集成场景 3: 非法连线拒绝', () => {
    it('应该拒绝 ROLE -> RESOURCE 的反向连接', async () => {
      const tenantId = 'tenant-test-001';

      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'ROLE' })
        .mockResolvedValueOnce({ type: 'RESOURCE' });

      const result = await visService.validateEdgeConnection(
        'node-role-1',
        'node-resource-1',
        'INHERITANCE',
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不允许的连线');
    });
  });
});
