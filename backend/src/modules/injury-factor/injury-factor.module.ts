import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupationalAccidentCaseEntity } from '../occupational-accident-report/entities/occupational-accident-case.entity.js';
import { InjuryFactorController } from './injury-factor.controller.js';
import { InjuryFactorEntity } from './injury-factor.entity.js';
import { InjuryFactorService } from './injury-factor.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InjuryFactorEntity,
      OccupationalAccidentCaseEntity,
    ]),
  ],
  controllers: [InjuryFactorController],
  providers: [InjuryFactorService],
  exports: [InjuryFactorService],
})
export class InjuryFactorModule {}
