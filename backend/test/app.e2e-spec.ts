/**
 * VisPerm 端到端集成测试
 * 使用 Test.createTestingModule 创建真实模块实例
 * 测试 /vis/nodes GET/POST 和 /iam/roles GET/POST
 * 至少 6 个 E2E 测试用例
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { CacheService } from '../src/modules/cache/cache.service';

describe('VisPerm E2E 测试 (AppController)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 模拟 CacheService 以避免 E2E 测试需要真实 Redis
  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    clearPattern: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CacheService)
      .useValue(mockCacheService)
      .compile();

    app = moduleFixture.createNestApplication();
    // 应用全局验证管道
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // 清理测试数据
  beforeEach(async () => {
    try {
      await prisma.visEdge.deleteMany({ where: {} });
      await prisma.visNode.deleteMany({ where: {} });
      await prisma.visTopology.deleteMany({ where: {} });
      await prisma.visAuditLog.deleteMany({ where: {} });
      await prisma.sysUserRole.deleteMany({ where: {} });
      await prisma.sysRole.deleteMany({ where: {} });
      await prisma.sysResourceMeta.deleteMany({ where: {} });
    } catch {
      // 测试环境可能没有数据库连接，跳过清理
    }
  });

  // ==================== /vis/nodes 测试 ====================

  describe('GET /vis/nodes', () => {
    it('应该返回空节点列表', async () => {
      return request(app.getHttpServer())
        .get('/vis/nodes')
        .set('x-tenant-id', 'e2e-test-tenant')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /vis/nodes', () => {
    it('应该成功创建节点', async () => {
      const createNodeDto = {
        tenantId: 'e2e-test-tenant',
        type: 'RESOURCE',
        name: 'E2E 测试资源',
        code: 'e2e_resource',
        positionX: 100,
        positionY: 200,
      };

      return request(app.getHttpServer())
        .post('/vis/nodes')
        .set('x-tenant-id', 'e2e-test-tenant')
        .send(createNodeDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('E2E 测试资源');
          expect(res.body.type).toBe('RESOURCE');
          expect(res.body.tenantId).toBe('e2e-test-tenant');
        });
    });

    it('应该在创建后能够查询到该节点', async () => {
      // 先创建节点
      const createNodeDto = {
        tenantId: 'e2e-test-tenant',
        type: 'ROLE',
        name: 'E2E 角色',
        code: 'e2e_role',
      };

      await request(app.getHttpServer())
        .post('/vis/nodes')
        .set('x-tenant-id', 'e2e-test-tenant')
        .send(createNodeDto)
        .expect(201);

      // 然后查询
      return request(app.getHttpServer())
        .get('/vis/nodes')
        .set('x-tenant-id', 'e2e-test-tenant')
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].name).toBe('E2E 角色');
        });
    });
  });

  // ==================== /iam/roles 测试 ====================

  describe('GET /iam/roles', () => {
    it('应该返回空角色列表', async () => {
      return request(app.getHttpServer())
        .get('/iam/roles')
        .set('x-tenant-id', 'e2e-test-tenant')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /iam/roles', () => {
    it('应该成功创建角色', async () => {
      const createRoleDto = {
        tenantId: 'e2e-test-tenant',
        name: 'E2E 测试角色',
        code: 'e2e_test_role',
        description: 'E2E 测试用角色描述',
      };

      return request(app.getHttpServer())
        .post('/iam/roles')
        .set('x-tenant-id', 'e2e-test-tenant')
        .send(createRoleDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('E2E 测试角色');
          expect(res.body.code).toBe('e2e_test_role');
          expect(res.body.tenantId).toBe('e2e-test-tenant');
        });
    });

    it('应该在创建角色后能查询到', async () => {
      // 先创建角色
      const createRoleDto = {
        tenantId: 'e2e-test-tenant',
        name: '查询测试角色',
        code: 'query_test_role',
      };

      await request(app.getHttpServer())
        .post('/iam/roles')
        .set('x-tenant-id', 'e2e-test-tenant')
        .send(createRoleDto)
        .expect(201);

      // 查询验证
      return request(app.getHttpServer())
        .get('/iam/roles')
        .set('x-tenant-id', 'e2e-test-tenant')
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThan(0);
          const foundRole = res.body.find((r: any) => r.code === 'query_test_role');
          expect(foundRole).toBeDefined();
        });
    });
  });

  // ==================== 跨租户隔离测试 ====================

  describe('跨租户隔离', () => {
    it('不同租户的节点应该隔离', async () => {
      // 租户 A 创建节点
      await request(app.getHttpServer())
        .post('/vis/nodes')
        .set('x-tenant-id', 'tenant-A')
        .send({
          tenantId: 'tenant-A',
          type: 'RESOURCE',
          name: '租户A节点',
          code: 'tenant_a_node',
        })
        .expect(201);

      // 租户 B 查询节点，不应该看到租户 A 的节点
      return request(app.getHttpServer())
        .get('/vis/nodes')
        .set('x-tenant-id', 'tenant-B')
        .expect(200)
        .expect((res) => {
          const tenantANode = res.body.find((n: any) => n.code === 'tenant_a_node');
          expect(tenantANode).toBeUndefined();
        });
    });
  });

  // ==================== 租户守卫测试 ====================

  describe('租户守卫 (TenantGuard)', () => {
    it('缺少 x-tenant-id 请求头时应返回 401', async () => {
      return request(app.getHttpServer())
        .get('/vis/nodes')
        .expect(401);
    });

    it('缺少 x-tenant-id 创建节点时应返回 401', async () => {
      return request(app.getHttpServer())
        .post('/vis/nodes')
        .send({
          tenantId: 'test-tenant',
          type: 'RESOURCE',
          name: '测试节点',
          code: 'test_node',
        })
        .expect(401);
    });
  });
});
