import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import {
  ApiCreateUserDocs,
  ApiGetAllUsersDocs,
  ApiGetMyProfileDocs,
  ApiGetUserByIdDocs,
  ApiUpdateMyProfileDocs,
  ApiUpdateUserDocs,
  ApiUpdateUserStatusDocs,
  ApiDeleteUserDocs,
} from './docs/user.swagger.js';
import { UserService } from './user.service.js';
import { MAX_IMAGE_FILE_SIZE } from '../file/file.constants.js';
import type { MultipartFile } from '../file/file.types.js';

@ApiTags('Users – Người dùng')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateUserDocs()
  createUser(@CurrentUser() user: { id: number }, @Body() dto: CreateUserDto) {
    return this.userService.createUser(dto, user?.id);
  }

  @Get()
  @Roles(RoleCode.ADMIN)
  @ApiGetAllUsersDocs()
  getAllUsers(
    @CurrentUser() user: { id: number },
    @Query() query: UserQueryDto = {},
  ) {
    return this.userService.getAllUsers(user.id, query);
  }

  @Get('me')
  @ApiGetMyProfileDocs()
  getMyProfile(@CurrentUser() user: { id: number }) {
    return this.userService.getMyProfile(user.id);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Tải và gắn ảnh đại diện cho tài khoản hiện tại' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadMyAvatar(
    @CurrentUser() user: { id: number },
    @UploadedFile() file: MultipartFile | undefined,
  ) {
    return this.userService.uploadMyAvatar(user.id, file);
  }

  @Post(':id/avatar')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Quản trị viên tải và gắn avatar cho người dùng' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadUserAvatar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @UploadedFile() file: MultipartFile | undefined,
  ) {
    return this.userService.uploadUserAvatar(id, user.id, file);
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN)
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
  @Roles(RoleCode.ADMIN)
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
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiUpdateUserStatusDocs()
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteUserDocs()
  removeUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.userService.remove(id, user.id);
  }
}
