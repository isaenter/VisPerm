import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

/**
 * AuditService 单元测试
 * 覆盖 logAction, findAll (分页过滤)
 * 至少 5 个测试用例
 */
describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  // 模拟 PrismaService
  const mockPrismaService = {
    visAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== logAction 测试 ====================

  describe('logAction', () => {
    it('应该成功创建审计日志', async () => {
      mockPrismaService.visAuditLog.create.mockResolvedValue({
        id: 'log-1',
        tenantId: 'tenant-1',
        action: 'CREATE',
        resource: 'node',
        resourceId: 'node-1',
        userId: 'user-1',
        details: { name: '测试节点' },
        createdAt: new Date(),
      });

      await service.logAction('tenant-1', 'CREATE', 'node', 'node-1', 'user-1', { name: '测试节点' });

      expect(prisma.visAuditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          action: 'CREATE',
          resource: 'node',
          resourceId: 'node-1',
          userId: 'user-1',
          details: { name: '测试节点' },
        },
      });
    });

    it('应该使用默认值当 resourceId 和 userId 未提供时', async () => {
      mockPrismaService.visAuditLog.create.mockResolvedValue({ id: 'log-2' });

      await service.logAction('tenant-1', 'DELETE', 'edge');

      expect(prisma.visAuditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          action: 'DELETE',
          resource: 'edge',
          resourceId: null,
          userId: 'system',
          details: {},
        },
      });
    });

    it('不应该在写入失败时抛出异常（容错设计）', async () => {
      mockPrismaService.visAuditLog.create.mockRejectedValue(new Error('数据库连接失败'));

      // 不应抛出异常，审计日志失败不应阻断主流程
      await expect(service.logAction('tenant-1', 'CREATE', 'node')).resolves.toBeUndefined();
    });
  });

  // ==================== findAuditLogs 分页过滤测试 ====================

  describe('findAuditLogs', () => {
    it('应该返回分页的审计日志', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'CREATE', resource: 'node' },
        { id: 'log-2', action: 'UPDATE', resource: 'role' },
      ];
      mockPrismaService.visAuditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.visAuditLog.count.mockResolvedValue(2);

      const result = await service.findAuditLogs({
        tenantId: 'tenant-1',
        page: 1,
        pageSize: 10,
      });

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('应该支持按 action 过滤', async () => {
      mockPrismaService.visAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.visAuditLog.count.mockResolvedValue(0);

      await service.findAuditLogs({
        tenantId: 'tenant-1',
        action: 'CREATE',
      });

      expect(prisma.visAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            action: 'CREATE',
          }),
        })
      );
    });

    it('应该支持按 resource 和 userId 过滤', async () => {
      mockPrismaService.visAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.visAuditLog.count.mockResolvedValue(0);

      await service.findAuditLogs({
        tenantId: 'tenant-1',
        resource: 'node',
        userId: 'user-1',
      });

      expect(prisma.visAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            resource: 'node',
            userId: 'user-1',
          }),
        })
      );
    });

    it('应该使用默认分页参数', async () => {
      mockPrismaService.visAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.visAuditLog.count.mockResolvedValue(0);

      await service.findAuditLogs({
        tenantId: 'tenant-1',
      });

      expect(prisma.visAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('应该正确计算多页总数', async () => {
      mockPrismaService.visAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.visAuditLog.count.mockResolvedValue(95);

      const result = await service.findAuditLogs({
        tenantId: 'tenant-1',
        page: 2,
        pageSize: 20,
      });

      expect(result.totalPages).toBe(5); // ceil(95/20) = 5
      expect(result.page).toBe(2);
      expect(prisma.visAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (2-1) * 20
          take: 20,
        })
      );
    });
  });
});
