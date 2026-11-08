import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccidentCauseController } from './accident-cause.controller.js';
import { AccidentCauseEntity } from './accident-cause.entity.js';
import { AccidentCauseService } from './accident-cause.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AccidentCauseEntity])],
  controllers: [AccidentCauseController],
  providers: [AccidentCauseService],
  exports: [AccidentCauseService],
})
export class AccidentCauseModule {}
