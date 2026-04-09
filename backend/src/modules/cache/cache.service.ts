import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis 缓存服务
 * 提供基础的 Redis 操作封装
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Redis 连接成功');
    } catch (error) {
      this.logger.warn(`Redis 连接失败: ${error}，缓存功能将不可用`);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * 获取缓存值
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET 失败: ${key} - ${error}`);
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlSeconds 过期时间（秒），默认 300
   */
  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.error(`Redis SET 失败: ${key} - ${error}`);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL 失败: ${key} - ${error}`);
    }
  }

  /**
   * 按模式清除缓存（使用 SCAN 避免阻塞）
   * @param pattern 键模式，如 "perm:*"
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(`已清除 ${keys.length} 个匹配 "${pattern}" 的缓存键`);
      }
    } catch (error) {
      this.logger.error(`Redis 清除模式失败: ${pattern} - ${error}`);
    }
  }

  /**
   * 使用 SCAN 迭代获取匹配的键（避免 KEYS 命令阻塞）
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = parseInt(result[0], 10);
      keys.push(...result[1]);
    } while (cursor !== 0);

    return keys;
  }
}
