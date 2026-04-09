import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 启用 CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // 配置 Swagger API 文档
  const config = new DocumentBuilder()
    .setTitle('VisPerm API')
    .setDescription('可视化权限拓扑编排系统 API 文档')
    .setVersion('0.1')
    .addTag('可视化拓扑', '画布节点和连线的 CRUD 操作')
    .addTag('拓扑管理', '权限拓扑图的创建、查询、更新、删除和发布')
    .addTag('IAM 权限管理', '角色、用户角色分配和资源元数据管理')
    .addTag('资源元数据', '资源字段定义和元数据信息管理')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 VisPerm 后端服务已启动：http://localhost:${port}`);
  console.log(`📚 API 文档：http://localhost:${port}/api-docs`);
}

bootstrap();
