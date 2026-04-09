# VisPerm 缓存与降级设计 V1.0

## 文档信息

| 字段 | 值 |
|------|-----|
| 版本 | V1.0 |
| 创建日期 | 2026/04/09 |
| 状态 | 待实施 |
| 关联 ADR | ADR-001 |

---

## 一、缓存架构

### 1.1 缓存层级图

```
┌─────────────────────────────────────────────────────────┐
│                     应用层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  权限查询   │  │  拓扑查询   │  │  资源元数据 │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │              │
│  ┌──────▼────────────────▼────────────────▼──────┐      │
│  │           CacheService (统一缓存层)            │      │
│  └──────┬───────────────────────────────────────┘      │
└─────────┼───────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────┐
│                      Redis                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │permission:  │  │graph:       │  │resource:    │      │
│  │{userId}     │  │{graphId}    │  │{code}       │      │
│  │TTL: 30min   │  │TTL: 1h      │  │TTL: 24h     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 缓存对象定义

| 缓存类型 | 缓存对象 | 说明 |
|----------|----------|------|
| 权限缓存 | 用户权限树、角色计算结果 | 权限计算引擎的输出结果 |
| 拓扑缓存 | 拓扑快照（节点 + 连线） | LogicFlow 画布渲染数据 |
| 资源缓存 | 资源元数据 | 系统中定义的资源清单 |

### 1.3 缓存键设计

| 缓存类型 | Key 格式 | 隔离维度 | TTL |
|----------|----------|----------|-----|
| 权限缓存 | `perm:user:{userId}` | 用户 ID | 30 分钟 |
| 权限缓存 | `perm:role:{roleId}:{version}` | 角色 ID + 版本号 | 1 小时 |
| 拓扑缓存 | `graph:{topologyId}:{version}` | 拓扑 ID + 版本号 | 1 小时 |
| 资源缓存 | `meta:resource:{code}` | 资源编码 | 24 小时 |

---

## 二、更新时序图

### 2.1 缓存写入流程

```
用户请求 ──→ CacheService ──→ Redis
    │              │            │
    │              │            │
    │         1. 检查缓存        │
    │              │            │
    │              │───────────→│ 2. Cache Miss
    │              │            │
    │              │←───────────│ 3. 返回空
    │              │            │
    │              │            │
    │         4. 调用计算引擎    │
    │              │            │
    │              │            │
    │←←←←←←←←←←←←←←│            │
    │   计算结果    │            │
    │              │            │
    │              │            │
    │              │───────────→│ 5. 写入缓存
    │              │            │
    │              │            │
    │←←←←←←←←←←←←←←←←←←←←←←←←←←←│
    │         返回结果           │
    │                          │
```

### 2.2 缓存失效流程

```
拓扑变更 ──→ VisService ──→ CacheService ──→ Redis
    │            │              │            │
    │            │              │            │
    │       1. 保存拓扑          │            │
    │            │              │            │
    │            │─────────────→│            │
    │            │   2. 递增版本号│            │
    │            │              │            │
    │            │              │───────────→│ 3. 失效旧缓存
    │            │              │            │
    │            │              │            │
    │            │              │───────────→│ 4. 触发预计算
    │            │              │            │
    │            │              │            │
    │←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←│
    │              完成                       │
    │                                        │
```

---

## 三、失败场景矩阵

| 失败场景 | 触发条件 | 降级级别 | 响应策略 | 数据源 |
|----------|----------|----------|----------|--------|
| Redis 不可用 | 连接超时/拒绝连接 | L1 | 直连数据库 + 本地内存缓存 | PostgreSQL |
| 数据库超时 | 查询 >5 秒 | L2 | 返回缓存快照 (标记过期) | Redis Cache |
| 计算超时 | 权限计算 >3 秒 | L3 | 返回上次的权限快照 | LocalCache |
| 全链路故障 | Redis+DB 均不可用 | L4 | 返回静态兜底配置 | Config File |
| 拓扑计算异常 | 环路检测失败 | L2 | 回退到上一个稳定版本 | Versioned Cache |
| 资源扫描不完整 | 资源元数据缺失 | L3 | 人工补录兜底 | Manual Entry |
| 过滤表达式解析失败 | DSL 解析错误 | L2 | 拒绝放行并记录审计 | Audit Log |
| 模拟运行失败 | 沙箱环境异常 | L3 | 仅展示部分路径信息 | Partial Result |

---

## 四、降级路径说明

### 4.1 降级决策树

```
权限查询请求
    │
    ▼
┌─────────────────┐
│ Redis 可用？     │── No ──→ L1: 直连数据库计算
└────────┬────────┘           │
         │ Yes                ▼
         │              ┌─────────────┐
         ▼              │ 记录降级日志 │
┌─────────────────┐     └─────────────┘
│ 缓存命中？       │── No ──→ 实时计算
└────────┬────────┘         │
         │ Yes              ▼
         │           ┌─────────────┐
         │           │ 计算超时？   │── Yes ──→ L3: 返回过期缓存
         │           └────────┬────┘
         │                    │ No
         │                    ▼
         │           ┌─────────────┐
         │           │ 写入缓存     │
         │           └─────────────┘
         │                    │
         ▼                    ▼
    ┌────────────────────────┐
    │   返回权限结果          │
    └────────────────────────┘
```

### 4.2 降级实现代码

```typescript
// backend/src/common/cache/cache.service.ts

@Injectable()
export class CacheService {
  private readonly CACHE_PREFIX = 'visperm:';
  private readonly FALLBACK_TTL = 300; // 5 分钟

  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 权限计算带降级逻辑
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: {
      ttl: number;
      timeout: number;
      allowStale: boolean;
    }
  ): Promise<T> {
    const fullKey = `${this.CACHE_PREFIX}${key}`;

    try {
      // 1. 尝试从缓存获取
      const cached = await this.redis.get(fullKey);
      if (cached) {
        this.logger.debug('缓存命中', { key });
        return JSON.parse(cached);
      }

      // 2. 正常计算 (带超时)
      const result = await Promise.race([
        computeFn(),
        this.timeout(options.timeout),
      ]);

      // 3. 写入缓存
      await this.redis.set(fullKey, JSON.stringify(result), 'EX', options.ttl);
      return result;

    } catch (error) {
      this.logger.warn('计算失败，尝试降级', { key, error });

      // 4. 降级：返回缓存快照 (即使过期)
      if (options.allowStale) {
        const staleCache = await this.redis.get(fullKey, { allowStale: true });
        if (staleCache) {
          this.logger.warn('使用过期缓存降级', { key });
          return JSON.parse(staleCache);
        }
      }

      // 5. 最终降级：返回兜底配置
      this.logger.error('降级失败，返回兜底配置', { key });
      throw new CacheFallbackError(key);
    }
  }

  /**
   * 缓存失效：支持版本号
   */
  async invalidate(pattern: string, version?: number): Promise<void> {
    const fullPattern = version
      ? `${this.CACHE_PREFIX}${pattern}:v${version}:*`
      : `${this.CACHE_PREFIX}${pattern}:*`;

    const keys = await this.redis.keys(fullPattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.info('缓存失效', { pattern, version, count: keys.length });
    }
  }
}
```

---

## 五、降级原则

| 场景类型 | 原则 | 说明 |
|----------|------|------|
| 安全敏感场景 | 默认拒绝 | 权限校验失败时，默认拒绝访问 |
| 管理后台配置类 | 可见异常、不可静默放过 | 配置错误必须明确提示，不能静默失败 |
| 运行态查询场景 | 优先保证结果正确，其次考虑性能 | 降级时可以牺牲性能，但结果必须准确 |

---

## 六、监控指标

| 指标名称 | 类型 | 说明 | 告警阈值 |
|----------|------|------|----------|
| `cache_hit_total` | Counter | 缓存命中次数 | - |
| `cache_miss_total` | Counter | 缓存未命中次数 | - |
| `cache_hit_rate` | Gauge | 缓存命中率 | <80% 告警 |
| `cache_compute_duration_seconds` | Histogram | 缓存计算耗时 | P95 >1s 告警 |
| `degrade_mode_active` | Gauge | 降级模式激活状态 | 激活时告警 |
| `stale_cache_served_total` | Counter | 过期缓存服务次数 | 持续增长时告警 |

---

## 七、验收标准

| 验收项 | 通过标准 | 验证方法 |
|--------|----------|----------|
| 缓存命中率 | >80% | Redis 监控统计 |
| 缓存穿透防护 | 恶意请求不击穿缓存 | 压测验证 |
| 缓存雪崩防护 | 大量缓存同时失效时系统稳定 | 故障注入测试 |
| 降级触发 | 模拟故障时自动降级 | 关闭 Redis 验证 |
| 降级日志 | 所有降级事件有日志记录 | 日志审计 |

---

**文档版本**: V1.0  
**创建日期**: 2026/04/09  
**评审状态**: 待 Critic 评审
