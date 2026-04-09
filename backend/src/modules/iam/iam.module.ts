import { Module } from '@nestjs/common';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisModule } from '../vis/vis.module';

@Module({
  imports: [PrismaModule, VisModule],
  controllers: [IamController],
  providers: [IamService],
  exports: [IamService],
})
export class IamModule {}
