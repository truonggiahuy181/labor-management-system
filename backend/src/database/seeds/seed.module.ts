import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../../modules/role/role.entity.js';
import { UserEntity } from '../../modules/user/user.entity.js';
import { UserSeedService } from './user-seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity])],
  providers: [UserSeedService],
})
export class SeedModule {}
