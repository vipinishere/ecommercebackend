import { Module } from '@nestjs/common';
import { SpecificationService } from './specification.service';
import { SpecificationController } from './specification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AdminModule, // gives access to AdminJwtAuthGuard, RolesGuard
  ],
  controllers: [SpecificationController],
  providers: [SpecificationService],
  exports: [SpecificationService], // exported so Product module can use it
})
export class SpecificationModule {}