import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndustryEntity } from './industry.entity.js';
import { IndustryService } from './industry.service.js';
import { IndustryController } from './industry.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([IndustryEntity])],
  controllers: [IndustryController],
  providers: [IndustryService],
  exports: [IndustryService],
})
export class IndustryModule {}
