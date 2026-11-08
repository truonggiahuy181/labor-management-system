import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccidentCauseEntity } from '../accident-cause/accident-cause.entity.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { InjuryFactorEntity } from '../injury-factor/injury-factor.entity.js';
import { OccupationEntity } from '../occupation/occupation.entity.js';
import { ReportPeriodEntity } from '../report-period/report-period.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { FileModule } from '../file/file.module.js';
import { OccupationalAccidentCaseEntity } from './entities/occupational-accident-case.entity.js';
import { OccupationalAccidentArticle39SummaryEntity } from './entities/occupational-accident-article39-summary.entity.js';
import { OccupationalAccidentReportHistoryEntity } from './entities/occupational-accident-report-history.entity.js';
import { OccupationalAccidentReportEntity } from './entities/occupational-accident-report.entity.js';
import { OccupationalAccidentReportSubmissionEntity } from './entities/occupational-accident-report-submission.entity.js';
import { OccupationalAccidentVictimGroupEntity } from './entities/occupational-accident-victim-group.entity.js';
import { OccupationalAccidentReportController } from './occupational-accident-report.controller.js';
import { OccupationalAccidentReportAdminController } from './occupational-accident-report-admin.controller.js';
import { OccupationalAccidentReportService } from './occupational-accident-report.service.js';

@Module({
  imports: [
    FileModule,
    TypeOrmModule.forFeature([
      OccupationalAccidentReportEntity,
      OccupationalAccidentCaseEntity,
      OccupationalAccidentVictimGroupEntity,
      OccupationalAccidentArticle39SummaryEntity,
      OccupationalAccidentReportSubmissionEntity,
      OccupationalAccidentReportHistoryEntity,
      UserEntity,
      EnterpriseEntity,
      ReportPeriodEntity,
      AccidentCauseEntity,
      InjuryFactorEntity,
      OccupationEntity,
    ]),
  ],
  controllers: [
    OccupationalAccidentReportController,
    OccupationalAccidentReportAdminController,
  ],
  providers: [OccupationalAccidentReportService],
  exports: [OccupationalAccidentReportService],
})
export class OccupationalAccidentReportModule {}
