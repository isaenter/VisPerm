/**
 * Prisma 数据库种子脚本
 * 生成演示数据：拓扑、节点、连线、快照等
 * 
 * 运行方式: npx ts-node prisma/seed.ts
 */
import { PrismaClient, NodeType, EdgeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始生成演示数据...');

  const tenantId = 'demo-tenant';

  // ========== 1. 创建拓扑 ==========
  const topology = await prisma.visTopology.create({
    data: {
      tenantId,
      name: '演示权限拓扑',
      description: '用于演示的权限编排拓扑图',
      env: 'prod',
    },
  });
  console.log(`✅ 拓扑已创建: ${topology.name} (${topology.id})`);

  // ========== 2. 创建 3 个资源节点 ==========
  const resource1 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.RESOURCE,
      name: '用户数据',
      code: 'user_data',
      positionX: 100,
      positionY: 100,
      config: { table: 'users', fields: ['id', 'name', 'email'] },
    },
  });
  console.log(`✅ 资源节点已创建: ${resource1.name}`);

  const resource2 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.RESOURCE,
      name: '订单数据',
      code: 'order_data',
      positionX: 100,
      positionY: 250,
      config: { table: 'orders', fields: ['id', 'amount', 'status'] },
    },
  });
  console.log(`✅ 资源节点已创建: ${resource2.name}`);

  const resource3 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.RESOURCE,
      name: '报表数据',
      code: 'report_data',
      positionX: 100,
      positionY: 400,
      config: { table: 'reports', fields: ['id', 'title', 'content'] },
    },
  });
  console.log(`✅ 资源节点已创建: ${resource3.name}`);

  // ========== 3. 创建 2 个过滤器节点 ==========
  const filter1 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.FILTER,
      name: '部门过滤',
      code: 'dept_filter',
      positionX: 350,
      positionY: 175,
      config: { expression: 'department = current_user_department' },
    },
  });
  console.log(`✅ 过滤器节点已创建: ${filter1.name}`);

  const filter2 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.FILTER,
      name: '时间过滤',
      code: 'time_filter',
      positionX: 350,
      positionY: 400,
      config: { expression: 'created_at >= date_sub(now(), interval 90 day)' },
    },
  });
  console.log(`✅ 过滤器节点已创建: ${filter2.name}`);

  // ========== 4. 创建 2 个角色节点 ==========
  const role1 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.ROLE,
      name: '管理员',
      code: 'admin',
      positionX: 600,
      positionY: 200,
      config: { description: '系统管理员，拥有所有权限' },
    },
  });
  console.log(`✅ 角色节点已创建: ${role1.name}`);

  const role2 = await prisma.visNode.create({
    data: {
      tenantId,
      topologyId: topology.id,
      type: NodeType.ROLE,
      name: '普通用户',
      code: 'user',
      positionX: 600,
      positionY: 400,
      config: { description: '普通用户，仅拥有基本权限' },
    },
  });
  console.log(`✅ 角色节点已创建: ${role2.name}`);

  // ========== 5. 创建若干连线 ==========
  // 资源 -> 过滤器
  const edge1 = await prisma.visEdge.create({
    data: {
      tenantId,
      sourceNodeId: resource1.id,
      targetNodeId: filter1.id,
      type: EdgeType.INHERITANCE,
    },
  });
  console.log(`✅ 连线已创建: ${resource1.name} -> ${filter1.name}`);

  const edge2 = await prisma.visEdge.create({
    data: {
      tenantId,
      sourceNodeId: resource2.id,
      targetNodeId: filter1.id,
      type: EdgeType.INHERITANCE,
    },
  });
  console.log(`✅ 连线已创建: ${resource2.name} -> ${filter1.name}`);

  const edge3 = await prisma.visEdge.create({
    data: {
      tenantId,
      sourceNodeId: resource3.id,
      targetNodeId: filter2.id,
      type: EdgeType.INHERITANCE,
    },
  });
  console.log(`✅ 连线已创建: ${resource3.name} -> ${filter2.name}`);

  // 过滤器 -> 角色
  const edge4 = await prisma.visEdge.create({
    data: {
      tenantId,
      sourceNodeId: filter1.id,
      targetNodeId: role1.id,
      type: EdgeType.INHERITANCE,
    },
  });
  console.log(`✅ 连线已创建: ${filter1.name} -> ${role1.name}`);

  const edge5 = await prisma.visEdge.create({
    data: {
      tenantId,
      sourceNodeId: filter2.id,
      targetNodeId: role2.id,
      type: EdgeType.NARROWING,
    },
  });
  console.log(`✅ 连线已创建: ${filter2.name} -> ${role2.name}`);

  // 资源 -> 角色（管理员直接访问订单）
  const edge6 = await prisma.visEdge.create({
    data: {
      tenantId,
      sourceNodeId: resource2.id,
      targetNodeId: role1.id,
      type: EdgeType.EXTENSION,
    },
  });
  console.log(`✅ 连线已创建: ${resource2.name} -> ${role1.name} (扩展)`);

  // ========== 6. 创建系统角色 ==========
  const sysRole1 = await prisma.sysRole.create({
    data: {
      tenantId,
      name: '系统管理员',
      code: 'admin',
      description: '系统管理员角色',
    },
  });
  console.log(`✅ 系统角色已创建: ${sysRole1.name}`);

  const sysRole2 = await prisma.sysRole.create({
    data: {
      tenantId,
      name: '普通用户',
      code: 'user',
      description: '普通用户角色',
    },
  });
  console.log(`✅ 系统角色已创建: ${sysRole2.name}`);

  // ========== 7. 创建快照 ==========
  const snapshot = await prisma.visSnapshot.create({
    data: {
      tenantId,
      topologyId: topology.id,
      version: 1,
      snapshot: {
        topology: {
          id: topology.id,
          name: topology.name,
          description: topology.description,
          env: topology.env,
        },
        nodes: [
          { id: resource1.id, type: 'RESOURCE', name: resource1.name, code: resource1.code, positionX: 100, positionY: 100, config: resource1.config },
          { id: resource2.id, type: 'RESOURCE', name: resource2.name, code: resource2.code, positionX: 100, positionY: 250, config: resource2.config },
          { id: resource3.id, type: 'RESOURCE', name: resource3.name, code: resource3.code, positionX: 100, positionY: 400, config: resource3.config },
          { id: filter1.id, type: 'FILTER', name: filter1.name, code: filter1.code, positionX: 350, positionY: 175, config: filter1.config },
          { id: filter2.id, type: 'FILTER', name: filter2.name, code: filter2.code, positionX: 350, positionY: 400, config: filter2.config },
          { id: role1.id, type: 'ROLE', name: role1.name, code: role1.code, positionX: 600, positionY: 200, config: role1.config },
          { id: role2.id, type: 'ROLE', name: role2.name, code: role2.code, positionX: 600, positionY: 400, config: role2.config },
        ],
        edges: [
          { id: edge1.id, sourceNodeId: resource1.id, targetNodeId: filter1.id, type: edge1.type },
          { id: edge2.id, sourceNodeId: resource2.id, targetNodeId: filter1.id, type: edge2.type },
          { id: edge3.id, sourceNodeId: resource3.id, targetNodeId: filter2.id, type: edge3.type },
          { id: edge4.id, sourceNodeId: filter1.id, targetNodeId: role1.id, type: edge4.type },
          { id: edge5.id, sourceNodeId: filter2.id, targetNodeId: role2.id, type: edge5.type },
          { id: edge6.id, sourceNodeId: resource2.id, targetNodeId: role1.id, type: edge6.type },
        ],
      } as any,
    },
  });
  console.log(`✅ 快照已创建: v${snapshot.version}`);

  // ========== 8. 创建审计日志 ==========
  await prisma.visAuditLog.create({
    data: {
      tenantId,
      action: 'CREATE',
      resource: 'topology',
      resourceId: topology.id,
      userId: 'system',
      details: { name: topology.name } as any,
    },
  });
  console.log('✅ 审计日志已创建');

  console.log('\n🎉 演示数据生成完成！');
  console.log(`   - 拓扑: 1 个`);
  console.log(`   - 资源节点: 3 个`);
  console.log(`   - 过滤器节点: 2 个`);
  console.log(`   - 角色节点: 2 个`);
  console.log(`   - 连线: 6 条`);
  console.log(`   - 系统角色: 2 个`);
  console.log(`   - 快照: 1 个`);
  console.log(`   - 审计日志: 1 条`);
}

main()
  .catch((e) => {
    console.error('❌ 种子脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
