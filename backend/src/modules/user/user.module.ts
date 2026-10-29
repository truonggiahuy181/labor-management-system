import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { RoleModule } from '../role/role.module.js';
import { FileModule } from '../file/file.module.js';
import { LocationModule } from '../location/location.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    RoleModule,
    FileModule,
    LocationModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
