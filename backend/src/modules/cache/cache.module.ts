import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Redis 缓存模块
 */
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
