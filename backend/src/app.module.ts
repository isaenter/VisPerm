import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { VisModule } from './modules/vis/vis.module';
import { IamModule } from './modules/iam/iam.module';
import { AuditModule } from './modules/audit/audit.module';
import { CacheModule } from './modules/cache/cache.module';
import { TenantGuard } from './common/tenant/tenant.context';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Prisma 数据模块
    PrismaModule,
    // 可视化拓扑模块
    VisModule,
    // IAM 权限模块
    IamModule,
    // 审计日志模块
    AuditModule,
    // Redis 缓存模块
    CacheModule,
  ],
  providers: [
    // 全局注册租户守卫，确保所有请求都必须携带 x-tenant-id 请求头
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
