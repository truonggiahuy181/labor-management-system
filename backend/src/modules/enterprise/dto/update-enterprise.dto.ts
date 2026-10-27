import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEnterpriseDto } from './create-enterprise.dto.js';

export class UpdateEnterpriseDto extends PartialType(
  OmitType(CreateEnterpriseDto, ['taxCode', 'email'] as const),
) {}
