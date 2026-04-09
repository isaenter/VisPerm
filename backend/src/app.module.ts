import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { VisModule } from './modules/vis/vis.module';
import { IamModule } from './modules/iam/iam.module';

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
  ],
})
export class AppModule {}
