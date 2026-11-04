import { PartialType } from '@nestjs/mapped-types';
import { CreateReportPeriodDto } from './create-report-period.dto.js';

export class UpdateReportPeriodDto extends PartialType(CreateReportPeriodDto) {}
