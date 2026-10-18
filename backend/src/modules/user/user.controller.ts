import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';

@ApiTags('Users – Người dùng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
        statusCode: 200,
        message: 'Thành công',
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
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/users/me',
      },
    },
  })
  async getMyProfile(@CurrentUser() user: { id: number }) {
    const profile = await this.userService.findOneOrFail({
      where: { id: user.id },
    });

    // Trả về các trường hiển thị; các trường nhạy cảm đã bị @Exclude() trong entity
    return {
      id: profile.id,
      username: profile.username,         // Read-only – chỉ hiển thị, không cho sửa
      fullName: profile.fullName,
      dob: profile.dob,
      gender: profile.gender,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      title: profile.title,
      avatarUrl: profile.avatarUrl,
      provinceId: profile.provinceId,
      districtId: profile.districtId,
      wardId: profile.wardId,
      address: profile.address,
      roleId: profile.roleId,
      enterpriseId: profile.enterpriseId,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
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
        statusCode: 200,
        message: 'Thành công',
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
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu cập nhật không hợp lệ.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Dữ liệu không hợp lệ',
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
        statusCode: 401,
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
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
