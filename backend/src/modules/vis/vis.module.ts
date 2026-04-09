import { Module } from '@nestjs/common';
import { VisController } from './vis.controller';
import { VisService } from './vis.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisController],
  providers: [VisService],
  exports: [VisService],
})
export class VisModule {}
