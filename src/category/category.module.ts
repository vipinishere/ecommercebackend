import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AdminModule, // gives access to AdminJwtAuthGuard, RolesGuard
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService], // exported so Product module can use getCategoryAttributes
})
export class CategoryModule {}