import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupationController } from './occupation.controller.js';
import { OccupationEntity } from './occupation.entity.js';
import { OccupationService } from './occupation.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OccupationEntity])],
  controllers: [OccupationController],
  providers: [OccupationService],
  exports: [OccupationService],
})
export class OccupationModule {}
