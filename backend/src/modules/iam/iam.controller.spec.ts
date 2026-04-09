import { Test, TestingModule } from '@nestjs/testing';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';
import { CreateResourceMetaDto, UpdateResourceMetaDto } from './dto/resource-meta.dto';

describe('IamController', () => {
  let controller: IamController;
  let service: IamService;

  // Mock IamService
  const mockIamService = {
    findAllRoles: jest.fn(),
    findRoleById: jest.fn(),
    createRole: jest.fn(),
    getUserRoles: jest.fn(),
    assignRoleToUser: jest.fn(),
    getUserPermissions: jest.fn(),
    findAllResourceMetas: jest.fn(),
    findResourceMetaByCode: jest.fn(),
    createResourceMeta: jest.fn(),
    updateResourceMeta: jest.fn(),
    deleteResourceMeta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IamController],
      providers: [
        {
          provide: IamService,
          useValue: mockIamService,
        },
      ],
    }).compile();

    controller = module.get<IamController>(IamController);
    service = module.get<IamService>(IamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 角色管理测试 ====================

  describe('findAllRoles', () => {
    it('应该返回所有角色列表', async () => {
      const mockRoles = [
        { id: '1', name: 'Admin', code: 'admin' },
        { id: '2', name: 'User', code: 'user' },
      ];
      mockIamService.findAllRoles.mockResolvedValue(mockRoles);

      const result = await controller.findAllRoles('t1');

      expect(result).toEqual(mockRoles);
      expect(service.findAllRoles).toHaveBeenCalledWith('t1');
    });
  });

  describe('findRoleById', () => {
    it('应该返回角色详情', async () => {
      const mockRole = { id: '1', name: 'Admin', code: 'admin' };
      mockIamService.findRoleById.mockResolvedValue(mockRole);

      const result = await controller.findRoleById('1');

      expect(result).toEqual(mockRole);
      expect(service.findRoleById).toHaveBeenCalledWith('1');
    });
  });

  describe('createRole', () => {
    it('应该创建新角色并返回结果', async () => {
      const dto: CreateRoleDto = {
        tenantId: 't1',
        name: 'Test Role',
        code: 'test_role',
        description: 'Test Description',
      };
      const mockRole = { id: '1', ...dto };
      mockIamService.createRole.mockResolvedValue(mockRole);

      const result = await controller.createRole(dto, 't1');

      expect(result).toEqual(mockRole);
      expect(service.createRole).toHaveBeenCalledWith({ ...dto, tenantId: 't1' });
    });
  });

  // ==================== 用户角色管理测试 ====================

  describe('getUserRoles', () => {
    it('应该返回用户的所有角色', async () => {
      const mockRoles = [
        { id: '1', name: 'Admin', code: 'admin' },
        { id: '2', name: 'User', code: 'user' },
      ];
      mockIamService.getUserRoles.mockResolvedValue(mockRoles);

      const result = await controller.getUserRoles('user1', 't1');

      expect(result).toEqual(mockRoles);
      expect(service.getUserRoles).toHaveBeenCalledWith('user1', 't1');
    });
  });

  describe('assignRoleToUser', () => {
    it('应该分配角色给用户并返回结果', async () => {
      const dto: AssignRoleToUserDto = {
        tenantId: 't1',
        userId: 'user1',
        roleId: 'role1',
      };
      const mockAssignment = { id: '1', ...dto };
      mockIamService.assignRoleToUser.mockResolvedValue(mockAssignment);

      const result = await controller.assignRoleToUser(dto, 't1');

      expect(result).toEqual(mockAssignment);
      expect(service.assignRoleToUser).toHaveBeenCalledWith({ ...dto, tenantId: 't1' });
    });
  });

  // ==================== 权限查询测试 ====================

  describe('getUserPermissions', () => {
    it('应该返回用户的完整权限信息', async () => {
      const mockPermissions = {
        userId: 'user1',
        tenantId: 't1',
        roles: [{ id: '1', name: 'Admin' }],
        permissions: [{ roleId: '1', resources: ['resource1'], filters: [] }],
      };
      mockIamService.getUserPermissions.mockResolvedValue(mockPermissions);

      const result = await controller.getUserPermissions('user1', 't1');

      expect(result).toEqual(mockPermissions);
      expect(service.getUserPermissions).toHaveBeenCalledWith('user1', 't1');
    });
  });

  // ==================== 资源元数据管理测试 ====================

  describe('findAllResourceMetas', () => {
    it('应该返回所有资源元数据列表', async () => {
      const mockMetas = [
        { resourceCode: 'user', name: '用户', fields: [] },
        { resourceCode: 'order', name: '订单', fields: [] },
      ];
      mockIamService.findAllResourceMetas.mockResolvedValue(mockMetas);

      const result = await controller.findAllResourceMetas('t1');

      expect(result).toEqual(mockMetas);
      expect(service.findAllResourceMetas).toHaveBeenCalledWith('t1');
    });
  });

  describe('findResourceMetaByCode', () => {
    it('应该返回资源元数据详情', async () => {
      const mockMeta = {
        resourceCode: 'user',
        name: '用户',
        fields: [{ name: 'id', type: 'string', label: 'ID' }],
      };
      mockIamService.findResourceMetaByCode.mockResolvedValue(mockMeta);

      const result = await controller.findResourceMetaByCode('user', 't1');

      expect(result).toEqual(mockMeta);
      expect(service.findResourceMetaByCode).toHaveBeenCalledWith('user', 't1');
    });
  });

  describe('createResourceMeta', () => {
    it('应该创建资源元数据并返回结果', async () => {
      const dto: CreateResourceMetaDto = {
        tenantId: 't1',
        resourceCode: 'product',
        name: '产品',
        fields: [{ name: 'id', type: 'string', label: 'ID' }],
      };
      const mockMeta = { ...dto };
      mockIamService.createResourceMeta.mockResolvedValue(mockMeta);

      const result = await controller.createResourceMeta(dto, 't1');

      expect(result).toEqual(mockMeta);
      expect(service.createResourceMeta).toHaveBeenCalledWith({ ...dto, tenantId: 't1' });
    });
  });

  describe('updateResourceMeta', () => {
    it('应该更新资源元数据并返回结果', async () => {
      const dto: UpdateResourceMetaDto = {
        name: '更新的产品',
      };
      const mockMeta = { resourceCode: 'product', ...dto };
      mockIamService.updateResourceMeta.mockResolvedValue(mockMeta);

      const result = await controller.updateResourceMeta('product', dto, 't1');

      expect(result).toEqual(mockMeta);
      expect(service.updateResourceMeta).toHaveBeenCalledWith('product', 't1', dto);
    });
  });

  describe('deleteResourceMeta', () => {
    it('应该删除资源元数据并返回结果', async () => {
      mockIamService.deleteResourceMeta.mockResolvedValue({ resourceCode: 'product' });

      const result = await controller.deleteResourceMeta('product', 't1');

      expect(result).toEqual({ resourceCode: 'product' });
      expect(service.deleteResourceMeta).toHaveBeenCalledWith('product', 't1');
    });
  });
});
