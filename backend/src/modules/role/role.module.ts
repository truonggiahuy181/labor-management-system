import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './role.entity.js';
import { RoleService } from './role.service.js';
import { RoleController } from './role.controller.js';
import { UserEntity } from '../user/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, UserEntity])],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
