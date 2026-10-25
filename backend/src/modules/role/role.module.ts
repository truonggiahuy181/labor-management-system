import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './role.entity.js';
import { RoleService } from './role.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity])],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
