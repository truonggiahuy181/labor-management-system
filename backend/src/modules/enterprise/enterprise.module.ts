import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnterpriseEntity } from './enterprise.entity.js';
import { BusinessRegistrationService } from './business-registration.service.js';
import { BusinessRegistrationController } from './business-registration.controller.js';
import { EnterpriseController } from './enterprise.controller.js';
import { EnterpriseService } from './enterprise.service.js';
import { UserModule } from '../user/user.module.js';
import { RedisModule } from '../../commons/redis/redis.module.js';
import { MailModule } from '../../commons/mail/mail.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([EnterpriseEntity]), UserModule, RedisModule, MailModule],
  controllers: [BusinessRegistrationController, EnterpriseController],
  providers: [BusinessRegistrationService, EnterpriseService],
})
export class EnterpriseModule {}
