import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import {
  ApiCreateUserDocs,
  ApiGetAllUsersDocs,
  ApiGetMyProfileDocs,
  ApiGetUserByIdDocs,
  ApiUpdateMyProfileDocs,
  ApiUpdateUserDocs,
  ApiUpdateUserStatusDocs,
} from './docs/user.swagger.js';
import { UserService } from './user.service.js';

@ApiTags('Users – Người dùng')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateUserDocs()
  createUser(@CurrentUser() user: { id: number }, @Body() dto: CreateUserDto) {
    return this.userService.createUser(dto, user?.id);
  }

  @Get()
  @ApiGetAllUsersDocs()
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get('me')
  @ApiGetMyProfileDocs()
  getMyProfile(@CurrentUser() user: { id: number }) {
    return this.userService.getMyProfile(user.id);
  }

  @Get(':id')
  @ApiGetUserByIdDocs()
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateMyProfileDocs()
  updateMyProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateUserDocs()
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, dto, user?.id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateUserStatusDocs()
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userService.updateStatus(id, dto.isActive, user?.id);
  }
}
