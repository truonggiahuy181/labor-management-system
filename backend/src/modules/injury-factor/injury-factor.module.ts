import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjuryFactorController } from './injury-factor.controller.js';
import { InjuryFactorEntity } from './injury-factor.entity.js';
import { InjuryFactorService } from './injury-factor.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InjuryFactorEntity])],
  controllers: [InjuryFactorController],
  providers: [InjuryFactorService],
  exports: [InjuryFactorService],
})
export class InjuryFactorModule {}
