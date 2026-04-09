import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { VisService } from './vis.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto } from './dto/edge.dto';

/**
 * VisService 单元测试
 * 覆盖 createNode, updateNode, deleteNode, validateEdgeConnection, validateTopology
 * 至少 15 个测试用例
 */
describe('VisService', () => {
  let service: VisService;
  let prisma: PrismaService;

  // 模拟 PrismaService
  const mockPrismaService = {
    visNode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    visEdge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    $transaction: jest.fn(),
  };

  // 模拟 CacheService
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clearPattern: jest.fn(),
  };

  // 模拟 AuditService
  const mockAuditService = {
    logAction: jest.fn(),
    findAuditLogs: jest.fn(),
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

    service = module.get<VisService>(VisService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 节点 CRUD 测试 ====================

  describe('createNode', () => {
    it('应该成功创建节点', async () => {
      const dto: CreateNodeDto = {
        tenantId: 'tenant-1',
        type: 'RESOURCE',
        name: '测试资源',
        code: 'test_resource',
        positionX: 100,
        positionY: 200,
        config: { key: 'value' },
      };
      const createdNode = { id: 'node-1', ...dto, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaService.visNode.create.mockResolvedValue(createdNode);

      const result = await service.createNode(dto);

      expect(result).toEqual(createdNode);
      expect(prisma.visNode.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          type: 'RESOURCE',
          name: '测试资源',
          code: 'test_resource',
          positionX: 100,
          positionY: 200,
          config: { key: 'value' },
        },
      });
      // 验证审计日志被记录
      expect(mockAuditService.logAction).toHaveBeenCalled();
      // 验证缓存被清除
      expect(mockCacheService.clearPattern).toHaveBeenCalledWith('perm:*');
    });

    it('应该使用默认值创建节点（无 position 和 config）', async () => {
      const dto: CreateNodeDto = {
        tenantId: 'tenant-1',
        type: 'ROLE',
        name: '管理员',
        code: 'admin',
      };
      const createdNode = { id: 'node-2', ...dto, positionX: 0, positionY: 0, config: {}, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaService.visNode.create.mockResolvedValue(createdNode);

      const result = await service.createNode(dto);

      expect(result.positionX).toBe(0);
      expect(result.positionY).toBe(0);
      expect(result.config).toEqual({});
    });
  });

  describe('updateNode', () => {
    it('应该成功更新节点并带有 tenantId 隔离', async () => {
      const dto: UpdateNodeDto = {
        name: '更新后的名称',
        positionX: 300,
        positionY: 400,
      };
      const updatedNode = {
        id: 'node-1',
        tenantId: 'tenant-1',
        name: '更新后的名称',
        positionX: 300,
        positionY: 400,
        updatedAt: new Date(),
      };
      mockPrismaService.visNode.update.mockResolvedValue(updatedNode);

      const result = await service.updateNode('node-1', dto, 'tenant-1');

      expect(result).toEqual(updatedNode);
      expect(prisma.visNode.update).toHaveBeenCalledWith({
        where: { id: 'node-1', tenantId: 'tenant-1' },
        data: { name: '更新后的名称', positionX: 300, positionY: 400 },
      });
    });

    it('应该使用 tenantId 防止跨租户更新（IDOR 防护）', async () => {
      const dto: UpdateNodeDto = { name: '被篡改的名称' };
      mockPrismaService.visNode.update.mockRejectedValue(
        new Error('Record to update not found')
      );

      // 攻击者尝试用 tenant-2 更新 tenant-1 的节点
      await expect(service.updateNode('node-1', dto, 'tenant-2'))
        .rejects.toThrow('Record to update not found');

      // 验证查询包含了正确的 tenantId
      expect(prisma.visNode.update).toHaveBeenCalledWith({
        where: { id: 'node-1', tenantId: 'tenant-2' },
        data: { name: '被篡改的名称' },
      });
    });
  });

  describe('deleteNode', () => {
    it('应该删除节点及其关联的连线（事务包裹）', async () => {
      const mockTx = {
        visNode: {
          findUnique: jest.fn().mockResolvedValue({ id: 'node-1', name: '待删除节点' }),
          delete: jest.fn().mockResolvedValue({ id: 'node-1', name: '待删除节点' }),
        },
        visEdge: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.deleteNode('node-1', 'tenant-1');

      expect(result).toEqual({ id: 'node-1', name: '待删除节点' });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      // 验证事务内删除了关联连线
      expect(mockTx.visEdge.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          OR: [{ sourceNodeId: 'node-1' }, { targetNodeId: 'node-1' }],
        },
      });
      // 验证审计日志被记录
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('当节点不存在时应该抛出 NotFoundException', async () => {
      const mockTx = {
        visNode: {
          findUnique: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
        },
        visEdge: {
          deleteMany: jest.fn(),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(service.deleteNode('node-1', 'wrong-tenant'))
        .rejects.toThrow('节点 node-1 不存在');
    });
  });

  // ==================== validateEdgeConnection 测试 ====================

  describe('validateEdgeConnection', () => {
    it('应该允许 RESOURCE -> FILTER 连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'RESOURCE', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' });
      mockPrismaService.visEdge.findFirst.mockResolvedValue(null);

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(true);
    });

    it('应该允许 FILTER -> ROLE 连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'ROLE', tenantId: 'tenant-1' });
      mockPrismaService.visEdge.findFirst.mockResolvedValue(null);

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(true);
    });

    it('应该允许 FILTER -> FILTER 连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' });
      mockPrismaService.visEdge.findFirst.mockResolvedValue(null);

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(true);
    });

    it('应该允许 ADDON -> ROLE 连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'ADDON', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'ROLE', tenantId: 'tenant-1' });
      mockPrismaService.visEdge.findFirst.mockResolvedValue(null);

      const result = await service.validateEdgeConnection('node1', 'node2', 'EXTENSION', 'tenant-1');

      expect(result.valid).toBe(true);
    });

    it('应该拒绝 FILTER -> RESOURCE 反向连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'RESOURCE', tenantId: 'tenant-1' });

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不允许的连线');
    });

    it('应该拒绝 ROLE 作为源节点', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'ROLE', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'RESOURCE', tenantId: 'tenant-1' });

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(false);
    });

    it('应该拒绝 ADDON -> FILTER 非法连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'ADDON', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' });

      const result = await service.validateEdgeConnection('node1', 'node2', 'EXTENSION', 'tenant-1');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不允许的连线');
    });

    it('应该拒绝不存在的源节点', async () => {
      mockPrismaService.visNode.findUnique.mockResolvedValueOnce(null);

      const result = await service.validateEdgeConnection('nonexistent', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('源节点或目标节点不存在');
    });

    it('应该拒绝不存在的目标节点', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'RESOURCE', tenantId: 'tenant-1' })
        .mockResolvedValueOnce(null);

      const result = await service.validateEdgeConnection('node1', 'nonexistent', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('源节点或目标节点不存在');
    });

    it('应该拒绝跨租户连线', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'RESOURCE', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-2' });

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('跨租户');
    });

    it('应该拒绝已存在的重边', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: 'RESOURCE', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ type: 'FILTER', tenantId: 'tenant-1' });
      mockPrismaService.visEdge.findFirst.mockResolvedValue({ id: 'existing-edge' });

      const result = await service.validateEdgeConnection('node1', 'node2', 'INHERITANCE', 'tenant-1');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('已存在相同的连线');
    });
  });

  // ==================== validateTopology 测试 ====================

  describe('validateTopology', () => {
    it('应该检测出简单环路 A -> B -> A', async () => {
      const nodes = [
        { id: '1', type: 'RESOURCE' },
        { id: '2', type: 'FILTER' },
      ];
      const edges = [
        { sourceNodeId: '1', targetNodeId: '2' },
        { sourceNodeId: '2', targetNodeId: '1' },
      ];

      const result = await service.validateTopology(nodes, edges);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('检测到环路，请检查连线配置');
    });

    it('应该检测出复杂环路 A -> B -> C -> A', async () => {
      const nodes = [
        { id: '1', type: 'RESOURCE' },
        { id: '2', type: 'FILTER' },
        { id: '3', type: 'ROLE' },
      ];
      const edges = [
        { sourceNodeId: '1', targetNodeId: '2' },
        { sourceNodeId: '2', targetNodeId: '3' },
        { sourceNodeId: '3', targetNodeId: '1' },
      ];

      const result = await service.validateTopology(nodes, edges);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('检测到环路，请检查连线配置');
    });

    it('应该通过无环路的拓扑', async () => {
      const nodes = [
        { id: '1', type: 'RESOURCE' },
        { id: '2', type: 'FILTER' },
        { id: '3', type: 'ROLE' },
      ];
      const edges = [
        { sourceNodeId: '1', targetNodeId: '2' },
        { sourceNodeId: '2', targetNodeId: '3' },
      ];

      const result = await service.validateTopology(nodes, edges);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('应该通过空图（无节点无边）', async () => {
      const result = await service.validateTopology([], []);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('应该通过仅有节点无边的拓扑', async () => {
      const nodes = [
        { id: '1', type: 'RESOURCE' },
        { id: '2', type: 'FILTER' },
      ];

      const result = await service.validateTopology(nodes, []);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('应该通过多分支无环拓扑', async () => {
      const nodes = [
        { id: '1', type: 'RESOURCE' },
        { id: '2', type: 'RESOURCE' },
        { id: '3', type: 'FILTER' },
        { id: '4', type: 'ROLE' },
      ];
      const edges = [
        { sourceNodeId: '1', targetNodeId: '3' },
        { sourceNodeId: '2', targetNodeId: '3' },
        { sourceNodeId: '3', targetNodeId: '4' },
      ];

      const result = await service.validateTopology(nodes, edges);

      expect(result.valid).toBe(true);
    });
  });
});
