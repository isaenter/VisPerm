import { Module } from '@nestjs/common';
import { IamController } from './iam.controller';
import { ResourceMetaController } from './resource-meta.controller';
import { IamService } from './iam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisModule } from '../vis/vis.module';

@Module({
  imports: [PrismaModule, VisModule],
  controllers: [IamController, ResourceMetaController],
  providers: [IamService],
  exports: [IamService],
})
export class IamModule {}
