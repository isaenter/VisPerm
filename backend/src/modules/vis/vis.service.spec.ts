import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VisService } from './vis.service';
import { NodeType, EdgeType } from '@prisma/client';

describe('VisService', () => {
  let service: VisService;
  let prisma: PrismaService;

  // Mock PrismaService
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VisService>(VisService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEdgeConnection', () => {
    it('应该允许 RESOURCE -> FILTER 连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: NodeType.RESOURCE })
        .mockResolvedValueOnce({ type: NodeType.FILTER });
      mockPrismaService.visEdge.findFirst.mockResolvedValue(null);

      const result = await service.validateEdgeConnection('node1', 'node2', EdgeType.INHERITANCE);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝 FILTER -> RESOURCE 反向连接', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: NodeType.FILTER })
        .mockResolvedValueOnce({ type: NodeType.RESOURCE });

      const result = await service.validateEdgeConnection('node1', 'node2', EdgeType.INHERITANCE);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不允许的连线');
    });

    it('应该拒绝 ROLE 作为源节点', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: NodeType.ROLE })
        .mockResolvedValueOnce({ type: NodeType.RESOURCE });

      const result = await service.validateEdgeConnection('node1', 'node2', EdgeType.INHERITANCE);
      expect(result.valid).toBe(false);
    });

    it('应该拒绝不存在的节点', async () => {
      mockPrismaService.visNode.findUnique.mockResolvedValue(null);

      const result = await service.validateEdgeConnection('nonexistent', 'node2', EdgeType.INHERITANCE);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('源节点或目标节点不存在');
    });

    it('应该拒绝已存在的重边', async () => {
      mockPrismaService.visNode.findUnique
        .mockResolvedValueOnce({ type: NodeType.RESOURCE })
        .mockResolvedValueOnce({ type: NodeType.FILTER });
      mockPrismaService.visEdge.findFirst.mockResolvedValue({ id: 'existing-edge' });

      const result = await service.validateEdgeConnection('node1', 'node2', EdgeType.INHERITANCE);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('已存在相同的连线');
    });
  });

  describe('validateTopology', () => {
    it('应该检测出环路', async () => {
      const nodes = [
        { id: '1', type: 'RESOURCE' },
        { id: '2', type: 'FILTER' },
        { id: '3', type: 'ROLE' },
      ];
      const edges = [
        { sourceNodeId: '1', targetNodeId: '2' },
        { sourceNodeId: '2', targetNodeId: '3' },
        { sourceNodeId: '3', targetNodeId: '1' }, // 环路
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
  });

  describe('calculatePermissionsForRole', () => {
    it('当角色不存在时应该返回错误', async () => {
      mockPrismaService.visNode.findFirst.mockResolvedValue(null);

      const result = await service.calculatePermissionsForRole('nonexistent', 'tenant1');
      expect(result.message).toBe('角色节点不存在');
    });
  });
});
