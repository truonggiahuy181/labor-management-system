import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupationalAccidentVictimGroupEntity } from '../occupational-accident-report/entities/occupational-accident-victim-group.entity.js';
import { OccupationController } from './occupation.controller.js';
import { OccupationEntity } from './occupation.entity.js';
import { OccupationService } from './occupation.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OccupationEntity,
      OccupationalAccidentVictimGroupEntity,
    ]),
  ],
  controllers: [OccupationController],
  providers: [OccupationService],
  exports: [OccupationService],
})
export class OccupationModule {}
