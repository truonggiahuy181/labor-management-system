import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessTypeEntity } from './business-type.entity.js';
import { BusinessTypeService } from './business-type.service.js';
import { BusinessTypeController } from './business-type.controller.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessTypeEntity, EnterpriseEntity])],
  controllers: [BusinessTypeController],
  providers: [BusinessTypeService],
  exports: [BusinessTypeService],
})
export class BusinessTypeModule {}
