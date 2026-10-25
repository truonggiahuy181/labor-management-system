import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessTypeEntity } from './business-type.entity.js';
import { BusinessTypeService } from './business-type.service.js';
import { BusinessTypeController } from './business-type.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessTypeEntity])],
  controllers: [BusinessTypeController],
  providers: [BusinessTypeService],
  exports: [BusinessTypeService],
})
export class BusinessTypeModule {}
