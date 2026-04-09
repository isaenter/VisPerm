import { Module } from '@nestjs/common';
import { VisController } from './vis.controller';
import { TopologyController } from './topology.controller';
import { SnapshotController } from './snapshot.controller';
import { VisService } from './vis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule],
  controllers: [VisController, TopologyController, SnapshotController],
  providers: [VisService],
  exports: [VisService],
})
export class VisModule {}
