import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnterpriseEntity } from './enterprise.entity.js';
import { EnterpriseController } from './enterprise.controller.js';
import { EnterpriseService } from './enterprise.service.js';
import { UserModule } from '../user/user.module.js';
import { BusinessTypeModule } from '../business-type/business-type.module.js';
import { IndustryModule } from '../industry/industry.module.js';
import { RoleModule } from '../role/role.module.js';
import { UserEntity } from '../user/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnterpriseEntity, UserEntity]),
    UserModule,
    BusinessTypeModule,
    IndustryModule,
    RoleModule,
  ],
  controllers: [EnterpriseController],
  providers: [EnterpriseService],
})
export class EnterpriseModule {}
