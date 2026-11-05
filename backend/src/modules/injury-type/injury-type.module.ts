import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjuryTypeController } from './injury-type.controller.js';
import { InjuryTypeEntity } from './injury-type.entity.js';
import { InjuryTypeService } from './injury-type.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InjuryTypeEntity])],
  controllers: [InjuryTypeController],
  providers: [InjuryTypeService],
  exports: [InjuryTypeService],
})
export class InjuryTypeModule {}
