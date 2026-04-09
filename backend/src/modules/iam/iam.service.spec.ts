import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IamService } from './iam.service';
import { CreateRoleDto, AssignRoleToUserDto } from './dto/role.dto';

describe('IamService', () => {
  let service: IamService;
  let prisma: PrismaService;

  const mockPrismaService = {
    sysRole: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    sysUserRole: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IamService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IamService>(IamService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllRoles', () => {
    it('应该返回所有角色列表', async () => {
      const mockRoles = [
        { id: '1', name: 'Admin', code: 'admin' },
        { id: '2', name: 'User', code: 'user' },
      ];
      mockPrismaService.sysRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAllRoles();
      expect(result).toEqual(mockRoles);
      expect(prisma.sysRole.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createRole', () => {
    it('应该创建新角色', async () => {
      const dto: CreateRoleDto = {
        tenantId: 'tenant1',
        name: 'Test Role',
        code: 'test_role',
        description: 'Test Description',
      };
      const mockRole = { id: '1', ...dto };
      mockPrismaService.sysRole.create.mockResolvedValue(mockRole);

      const result = await service.createRole(dto);
      expect(result).toEqual(mockRole);
      expect(prisma.sysRole.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant1',
          name: 'Test Role',
          code: 'test_role',
          description: 'Test Description',
        },
      });
    });
  });

  describe('getUserRoles', () => {
    it('应该返回用户的所有角色', async () => {
      const mockUserRoles = [
        { role: { id: '1', name: 'Admin', code: 'admin' } },
        { role: { id: '2', name: 'User', code: 'user' } },
      ];
      mockPrismaService.sysUserRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles('user1');
      expect(result).toEqual([
        { id: '1', name: 'Admin', code: 'admin' },
        { id: '2', name: 'User', code: 'user' },
      ]);
    });
  });

  describe('assignRoleToUser', () => {
    it('应该分配角色给用户', async () => {
      const dto: AssignRoleToUserDto = {
        tenantId: 'tenant1',
        userId: 'user1',
        roleId: 'role1',
      };
      const mockAssignment = { id: '1', ...dto };
      mockPrismaService.sysUserRole.create.mockResolvedValue(mockAssignment);

      const result = await service.assignRoleToUser(dto);
      expect(result).toEqual(mockAssignment);
      expect(prisma.sysUserRole.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant1',
          userId: 'user1',
          roleId: 'role1',
        },
      });
    });
  });
});
