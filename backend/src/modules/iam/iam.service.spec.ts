import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IamService } from './iam.service';
import { VisService } from '../vis/vis.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';

/**
 * IamService 单元测试
 * 覆盖 findAllRoles, createRole, assignRoleToUser, getUserPermissions 等
 * 至少 10 个测试用例
 */
describe('IamService', () => {
  let service: IamService;
  let prisma: PrismaService;

  // 模拟 PrismaService
  const mockPrismaService = {
    sysRole: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    sysUserRole: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    sysResourceMeta: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // 模拟 VisService
  const mockVisService = {
    calculatePermissionsForRole: jest.fn(),
  };

  // 模拟 CacheService
  const mockCacheService = {
    clearPattern: jest.fn(),
  };

  // 模拟 AuditService
  const mockAuditService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IamService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VisService,
          useValue: mockVisService,
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

    service = module.get<IamService>(IamService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 角色管理测试 ====================

  describe('findAllRoles', () => {
    it('应该返回指定租户的所有角色列表', async () => {
      const mockRoles = [
        { id: '1', name: '管理员', code: 'admin', tenantId: 'tenant-1' },
        { id: '2', name: '普通用户', code: 'user', tenantId: 'tenant-1' },
      ];
      mockPrismaService.sysRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAllRoles('tenant-1');

      expect(result).toEqual(mockRoles);
      expect(prisma.sysRole.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应该返回空数组当没有角色时', async () => {
      mockPrismaService.sysRole.findMany.mockResolvedValue([]);

      const result = await service.findAllRoles('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('createRole', () => {
    it('应该成功创建新角色', async () => {
      const dto: CreateRoleDto = {
        tenantId: 'tenant-1',
        name: '测试角色',
        code: 'test_role',
        description: '用于测试的角色',
      };
      const mockRole = { id: 'role-1', ...dto, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaService.sysRole.create.mockResolvedValue(mockRole);

      const result = await service.createRole(dto);

      expect(result).toEqual(mockRole);
      expect(prisma.sysRole.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          name: '测试角色',
          code: 'test_role',
          description: '用于测试的角色',
        },
      });
      // 验证审计日志
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'tenant-1', 'CREATE', 'role', 'role-1', undefined,
        { name: '测试角色', code: 'test_role' }
      );
    });

    it('应该创建没有描述的角色', async () => {
      const dto: CreateRoleDto = {
        tenantId: 'tenant-1',
        name: '简单角色',
        code: 'simple_role',
      };
      const mockRole = { id: 'role-2', ...dto, description: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaService.sysRole.create.mockResolvedValue(mockRole);

      const result = await service.createRole(dto);

      expect(result).toEqual(mockRole);
    });
  });

  // ==================== 用户角色管理测试 ====================

  describe('assignRoleToUser', () => {
    it('应该成功分配角色给用户', async () => {
      const dto: AssignRoleToUserDto = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roleId: 'role-1',
      };
      const mockAssignment = {
        id: 'ur-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.sysUserRole.create.mockResolvedValue(mockAssignment);

      const result = await service.assignRoleToUser(dto);

      expect(result).toEqual(mockAssignment);
      expect(prisma.sysUserRole.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          roleId: 'role-1',
        },
      });
      // 验证审计日志
      expect(mockAuditService.logAction).toHaveBeenCalled();
      // 验证缓存清除
      expect(mockCacheService.clearPattern).toHaveBeenCalledWith('perm:*');
    });
  });

  describe('getUserRoles', () => {
    it('应该返回用户的所有角色', async () => {
      const mockUserRoles = [
        { role: { id: '1', name: '管理员', code: 'admin' } },
        { role: { id: '2', name: '编辑者', code: 'editor' } },
      ];
      mockPrismaService.sysUserRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles('user-1', 'tenant-1');

      expect(result).toEqual([
        { id: '1', name: '管理员', code: 'admin' },
        { id: '2', name: '编辑者', code: 'editor' },
      ]);
      expect(prisma.sysUserRole.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', tenantId: 'tenant-1' },
        include: { role: true },
      });
    });

    it('应该返回空数组当用户没有角色时', async () => {
      mockPrismaService.sysUserRole.findMany.mockResolvedValue([]);

      const result = await service.getUserRoles('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  // ==================== 权限查询测试 ====================

  describe('getUserPermissions', () => {
    it('应该返回用户的完整权限信息', async () => {
      // 模拟用户有两个角色
      const mockUserRoles = [
        { role: { id: 'role-1', name: '管理员', code: 'admin' } },
        { role: { id: 'role-2', name: '编辑者', code: 'editor' } },
      ];
      mockPrismaService.sysUserRole.findMany.mockResolvedValue(mockUserRoles);

      // 模拟每个角色的权限计算结果
      mockVisService.calculatePermissionsForRole
        .mockResolvedValueOnce({
          roleCode: 'admin',
          resources: ['user_data', 'order_data'],
          filters: [],
          deniedResources: [],
        })
        .mockResolvedValueOnce({
          roleCode: 'editor',
          resources: ['article_data'],
          filters: ['status_filter'],
          deniedResources: [],
        });

      const result = await service.getUserPermissions('user-1', 'tenant-1');

      expect(result.userId).toBe('user-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.roles).toEqual([
        { id: 'role-1', name: '管理员', code: 'admin' },
        { id: 'role-2', name: '编辑者', code: 'editor' },
      ]);
      expect(result.permissions).toHaveLength(2);
      expect(result.permissions[0].resources).toContain('user_data');
      expect(result.permissions[1].resources).toContain('article_data');
    });

    it('应该正确处理没有任何角色的用户', async () => {
      mockPrismaService.sysUserRole.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissions('user-empty', 'tenant-1');

      expect(result.userId).toBe('user-empty');
      expect(result.roles).toEqual([]);
      expect(result.permissions).toEqual([]);
    });

    it('应该传递租户 ID 到权限计算', async () => {
      const mockUserRoles = [
        { role: { id: 'role-1', name: '管理员', code: 'admin' } },
      ];
      mockPrismaService.sysUserRole.findMany.mockResolvedValue(mockUserRoles);
      mockVisService.calculatePermissionsForRole.mockResolvedValue({
        roleCode: 'admin',
        resources: [],
        filters: [],
        deniedResources: [],
      });

      await service.getUserPermissions('user-1', 'specific-tenant');

      expect(mockVisService.calculatePermissionsForRole).toHaveBeenCalledWith(
        'admin',
        'specific-tenant',
      );
    });
  });

  // ==================== 批量操作测试 ====================

  describe('batchAssignRoles', () => {
    it('应该批量分配多个角色给用户', async () => {
      const mockResults = [
        { id: 'ur-1', userId: 'user-1', roleId: 'role-1', tenantId: 'tenant-1', role: { id: 'role-1', name: '角色1' } },
        { id: 'ur-2', userId: 'user-1', roleId: 'role-2', tenantId: 'tenant-1', role: { id: 'role-2', name: '角色2' } },
      ];
      mockPrismaService.sysUserRole.create
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await service.batchAssignRoles({
        userId: 'user-1',
        roleIds: ['role-1', 'role-2'],
        tenantId: 'tenant-1',
      });

      expect(result).toHaveLength(2);
      expect(prisma.sysUserRole.create).toHaveBeenCalledTimes(2);
      expect(mockCacheService.clearPattern).toHaveBeenCalledWith('perm:*');
    });

    it('应该跳过已存在的角色关联（P2002 错误）', async () => {
      // 第一个成功
      mockPrismaService.sysUserRole.create.mockResolvedValueOnce({
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
        tenantId: 'tenant-1',
      });
      // 第二个抛出唯一性约束错误
      mockPrismaService.sysUserRole.create.mockRejectedValueOnce({ code: 'P2002' });
      // 第三个成功
      mockPrismaService.sysUserRole.create.mockResolvedValueOnce({
        id: 'ur-3',
        userId: 'user-1',
        roleId: 'role-3',
        tenantId: 'tenant-1',
      });

      const result = await service.batchAssignRoles({
        userId: 'user-1',
        roleIds: ['role-1', 'role-2', 'role-3'],
        tenantId: 'tenant-1',
      });

      // 应该跳过 role-2，只返回 2 个结果
      expect(result).toHaveLength(2);
    });
  });
});
