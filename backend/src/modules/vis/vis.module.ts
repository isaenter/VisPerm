import { Module } from '@nestjs/common';
import { VisController } from './vis.controller';
import { TopologyController } from './topology.controller';
import { VisService } from './vis.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisController, TopologyController],
  providers: [VisService],
  exports: [VisService],
})
export class VisModule {}
