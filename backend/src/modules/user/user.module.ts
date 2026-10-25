import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { EnterpriseEntity } from '../enterprise/enterprise.entity.js';
import { RoleModule } from '../role/role.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, EnterpriseEntity]),
    RoleModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
