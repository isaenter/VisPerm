import { Module } from '@nestjs/common';
import { IamController } from './iam.controller';
import { ResourceMetaController } from './resource-meta.controller';
import { UserRoleController } from './user-role.controller';
import { IamService } from './iam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisModule } from '../vis/vis.module';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, VisModule, CacheModule, AuditModule],
  controllers: [IamController, ResourceMetaController, UserRoleController],
  providers: [IamService],
  exports: [IamService],
})
export class IamModule {}
