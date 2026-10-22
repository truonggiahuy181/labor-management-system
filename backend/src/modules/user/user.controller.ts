import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserMapper } from './user.mapper.js';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';

@ApiTags('Users – Người dùng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── TẠO MỚI NGƯỜI DÙNG ──────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo mới người dùng (Quản trị viên)',
    description:
      'Tạo tài khoản người dùng mới với thông tin cá nhân, phân quyền và liên hệ. ' +
      'Mật khẩu sẽ được băm tự động bằng Argon2.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo người dùng mới thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          id: 2,
          username: 'admin-vna',
          fullName: 'Nguyễn Văn A',
          dob: '1995-06-01',
          gender: 1,
          email: 'phanthanhthung093@gmail.com',
          phoneNumber: '0901234567',
          title: 'Chuyên viên',
          avatarUrl: 'https://example.com/avatar.jpg',
          provinceId: '79',
          districtId: '764',
          wardId: '26740',
          address: 'Phường Gò Vấp, TP Hồ Chí Minh',
          roleId: 2,
          enterpriseId: null,
          isActive: true,
          createdAt: '2026-10-22T08:00:00.000Z',
          updatedAt: '2026-10-22T08:00:00.000Z',
        },
        code: 201,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập.',
  })
  @ApiResponse({
    status: 409,
    description: 'Tên đăng nhập hoặc Email đã tồn tại trong hệ thống.',
  })
  async createUser(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateUserDto,
  ) {
    const newUser = await this.userService.createUser(dto, user?.id);
    return UserMapper.toResponse(newUser);
  }

  // ─── XEM THÔNG TIN TÀI KHOẢN ──────────────────────────────────────────────
  @Get('me')
  @ApiOperation({
    summary: 'Xem thông tin tài khoản của tôi',
    description: 'Trả về toàn bộ thông tin hồ sơ của người dùng đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tài khoản thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          id: 1,
          username: 'admin',
          fullName: 'Quản trị viên',
          dob: '1990-01-01',
          gender: 1,
          email: 'admin@example.com',
          phoneNumber: '0912345678',
          title: 'Trưởng phòng',
          avatarUrl: 'https://example.com/avatar.jpg',
          provinceId: '01',
          districtId: '001',
          wardId: '00001',
          address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
          roleId: 1,
          enterpriseId: null,
          isActive: true,
          createdAt: '2026-10-18T10:00:00.000Z',
          updatedAt: '2026-10-18T15:00:00.000Z',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ.',
    schema: {
      example: {
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
        success: false,
        data: null,
        code: 401,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/users/me',
      },
    },
  })
  async getMyProfile(@CurrentUser() user: { id: number }) {
    const profile = await this.userService.findOneOrFail({
      where: { id: user.id },
    });
    return UserMapper.toResponse(profile);
  }

  // ─── CẬP NHẬT THÔNG TIN TÀI KHOẢN ────────────────────────────────────────
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật thông tin tài khoản',
    description:
      'Trường username là cố định (read-only), KHÔNG thể thay đổi qua endpoint này. ' +
      'Để thay đổi email, sử dụng luồng OTP riêng tại /auth/request-email-change.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          id: 1,
          username: 'admin',
          fullName: 'Nguyễn Văn A (Đã cập nhật)',
          dob: '1990-01-01',
          gender: 1,
          email: 'admin@example.com',
          phoneNumber: '0988888888',
          title: 'Giám đốc',
          avatarUrl: 'https://example.com/new-avatar.jpg',
          provinceId: '01',
          districtId: '001',
          wardId: '00001',
          address: 'Số 10 Đường Láng, Đống Đa, Hà Nội',
          roleId: 1,
          updatedAt: '2026-10-18T16:05:00.000Z',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu cập nhật không hợp lệ.',
    schema: {
      example: {
        message: 'Dữ liệu không hợp lệ',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/users/me',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập.',
    schema: {
      example: {
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
        success: false,
        data: null,
        code: 401,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/users/me',
      },
    },
  })
  async updateMyProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateProfileDto,
  ) {
    // Đảm bảo username và các trường nhạy cảm không thể bị thay đổi qua DTO này
    const safeUpdate: Partial<UpdateProfileDto> & { updatedBy: number } = {
      ...dto,
      updatedBy: user.id,
    };

    const updated = await this.userService.update(user.id, safeUpdate as any);

    return {
      id: updated.id,
      username: updated.username,
      fullName: updated.fullName,
      dob: updated.dob,
      gender: updated.gender,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      title: updated.title,
      avatarUrl: updated.avatarUrl,
      provinceId: updated.provinceId,
      districtId: updated.districtId,
      wardId: updated.wardId,
      address: updated.address,
      roleId: updated.roleId,
      updatedAt: updated.updatedAt,
    };
  }
}
