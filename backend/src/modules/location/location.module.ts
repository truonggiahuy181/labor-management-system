import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationController } from './location.controller.js';
import { LocationService } from './location.service.js';
import { ProvinceEntity } from './province.entity.js';
import { WardEntity } from './ward.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProvinceEntity, WardEntity])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
