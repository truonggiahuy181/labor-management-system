import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupationalAccidentReportEntity } from '../occupational-accident-report/entities/occupational-accident-report.entity.js';
import { ReportPeriodController } from './report-period.controller.js';
import { ReportPeriodEntity } from './report-period.entity.js';
import { ReportPeriodService } from './report-period.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportPeriodEntity,
      OccupationalAccidentReportEntity,
    ]),
  ],
  controllers: [ReportPeriodController],
  providers: [ReportPeriodService],
  exports: [ReportPeriodService],
})
export class ReportPeriodModule {}
