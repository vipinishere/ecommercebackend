import { Module } from '@nestjs/common';
import { SpecificationController } from './specification.controller';
import { SpecificationService } from './specification.service';

@Module({
  controllers: [SpecificationController],
  providers: [SpecificationService]
})
export class SpecificationModule {}
