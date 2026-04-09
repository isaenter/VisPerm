import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VisController } from './vis.controller';
import { VisService } from './vis.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto, UpdateEdgeDto } from './dto/edge.dto';
import { NodeType, EdgeType } from '@prisma/client';

describe('VisController', () => {
  let controller: VisController;
  let service: VisService;

  // Mock VisService
  const mockVisService = {
    findAllNodes: jest.fn(),
    findNodeById: jest.fn(),
    createNode: jest.fn(),
    updateNode: jest.fn(),
    deleteNode: jest.fn(),
    findAllEdges: jest.fn(),
    createEdge: jest.fn(),
    updateEdge: jest.fn(),
    deleteEdge: jest.fn(),
    calculatePermissionsForRole: jest.fn(),
    validateTopology: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisController],
      providers: [
        {
          provide: VisService,
          useValue: mockVisService,
        },
      ],
    }).compile();

    controller = module.get<VisController>(VisController);
    service = module.get<VisService>(VisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 节点管理测试 ====================

  describe('findAllNodes', () => {
    it('应该调用 service 并返回节点列表', async () => {
      const mockNodes = [
        { id: '1', name: 'Node1', type: NodeType.RESOURCE, tenantId: 't1' },
        { id: '2', name: 'Node2', type: NodeType.FILTER, tenantId: 't1' },
      ];
      mockVisService.findAllNodes.mockResolvedValue(mockNodes);

      const result = await controller.findAllNodes('t1');

      expect(result).toEqual(mockNodes);
      expect(service.findAllNodes).toHaveBeenCalledWith('t1');
    });
  });

  describe('findNodeById', () => {
    it('当节点存在时应该返回节点详情', async () => {
      const mockNode = { id: '1', name: 'Node1', type: NodeType.RESOURCE };
      mockVisService.findNodeById.mockResolvedValue(mockNode);

      const result = await controller.findNodeById('1', 't1');

      expect(result).toEqual(mockNode);
      expect(service.findNodeById).toHaveBeenCalledWith('1', 't1');
    });

    it('当节点不存在时应该抛出 NotFoundException', async () => {
      mockVisService.findNodeById.mockResolvedValue(null);

      await expect(controller.findNodeById('nonexistent', 't1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createNode', () => {
    it('应该创建新节点并返回结果', async () => {
      const dto: CreateNodeDto = {
        tenantId: 't1',
        type: NodeType.RESOURCE,
        name: 'Test Node',
        code: 'test_node',
      };
      const mockNode = { id: '1', ...dto };
      mockVisService.createNode.mockResolvedValue(mockNode);

      const result = await controller.createNode(dto, 't1');

      expect(result).toEqual(mockNode);
      expect(service.createNode).toHaveBeenCalledWith({ ...dto, tenantId: 't1' });
    });
  });

  describe('updateNode', () => {
    it('应该更新节点并返回结果', async () => {
      const dto: UpdateNodeDto = { name: 'Updated Node', positionX: 100 };
      const mockNode = { id: '1', ...dto };
      mockVisService.updateNode.mockResolvedValue(mockNode);

      const result = await controller.updateNode('1', dto, 't1');

      expect(result).toEqual(mockNode);
      expect(service.updateNode).toHaveBeenCalledWith('1', dto, 't1');
    });
  });

  describe('deleteNode', () => {
    it('应该删除节点并返回结果', async () => {
      mockVisService.deleteNode.mockResolvedValue({ id: '1' });

      const result = await controller.deleteNode('1', 't1');

      expect(result).toEqual({ id: '1' });
      expect(service.deleteNode).toHaveBeenCalledWith('1', 't1');
    });
  });

  // ==================== 连线管理测试 ====================

  describe('findAllEdges', () => {
    it('应该调用 service 并返回连线列表', async () => {
      const mockEdges = [
        { id: '1', sourceNodeId: 'n1', targetNodeId: 'n2', type: EdgeType.INHERITANCE },
      ];
      mockVisService.findAllEdges.mockResolvedValue(mockEdges);

      const result = await controller.findAllEdges('t1');

      expect(result).toEqual(mockEdges);
      expect(service.findAllEdges).toHaveBeenCalledWith('t1');
    });
  });

  describe('createEdge', () => {
    it('应该创建新连线并返回结果', async () => {
      const dto: CreateEdgeDto = {
        tenantId: 't1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        type: EdgeType.INHERITANCE,
      };
      const mockEdge = { id: '1', ...dto };
      mockVisService.createEdge.mockResolvedValue(mockEdge);

      const result = await controller.createEdge(dto, 't1');

      expect(result).toEqual(mockEdge);
      expect(service.createEdge).toHaveBeenCalledWith({ ...dto, tenantId: 't1' });
    });
  });

  describe('updateEdge', () => {
    it('应该更新连线并返回结果', async () => {
      const dto: UpdateEdgeDto = { type: EdgeType.NARROWING };
      const mockEdge = { id: '1', ...dto };
      mockVisService.updateEdge.mockResolvedValue(mockEdge);

      const result = await controller.updateEdge('1', dto, 't1');

      expect(result).toEqual(mockEdge);
      expect(service.updateEdge).toHaveBeenCalledWith('1', dto, 't1');
    });
  });

  describe('deleteEdge', () => {
    it('应该删除连线并返回结果', async () => {
      mockVisService.deleteEdge.mockResolvedValue({ id: '1' });

      const result = await controller.deleteEdge('1', 't1');

      expect(result).toEqual({ id: '1' });
      expect(service.deleteEdge).toHaveBeenCalledWith('1', 't1');
    });
  });

  // ==================== 拓扑图操作测试 ====================

  describe('calculatePermissions', () => {
    it('应该调用 service 计算角色权限', async () => {
      const mockPermissions = {
        roleCode: 'role1',
        resources: ['resource1'],
        filters: [],
        paths: [],
        message: '权限计算完成',
      };
      mockVisService.calculatePermissionsForRole.mockResolvedValue(mockPermissions);

      const result = await controller.calculatePermissions('role1', 't1');

      expect(result).toEqual(mockPermissions);
      expect(service.calculatePermissionsForRole).toHaveBeenCalledWith('role1', 't1');
    });
  });

  describe('validateGraph', () => {
    it('应该调用 service 验证拓扑图', async () => {
      const mockValidation = { valid: true, issues: [] };
      mockVisService.validateTopology.mockResolvedValue(mockValidation);

      const nodes = [{ id: '1', type: 'RESOURCE' }];
      const edges: any[] = [];
      const result = await controller.validateGraph(nodes, edges);

      expect(result).toEqual(mockValidation);
      expect(service.validateTopology).toHaveBeenCalledWith(nodes, edges);
    });
  });
});
