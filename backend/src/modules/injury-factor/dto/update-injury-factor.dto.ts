import { PartialType } from '@nestjs/mapped-types';
import { CreateInjuryFactorDto } from './create-injury-factor.dto.js';

export class UpdateInjuryFactorDto extends PartialType(CreateInjuryFactorDto) {}
