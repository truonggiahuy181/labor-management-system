import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Public } from '../../commons/decorators/public.decorator.js';

@ApiTags('Users – Người dùng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  // ─── TẠO MỚI NGƯỜI DÙNG ──────────────────────────────────────────────────
  @Public()
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
    return this.userService.createUser(dto, user?.id);
  }

  // ─── DANH SÁCH NGƯỜI DÙNG (QUẢN TRỊ VIÊN) ────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả người dùng (Quản trị viên)',
    description:
      'Trả về danh sách người dùng, được sắp xếp theo ID giảm dần. Các trường nhạy cảm như mật khẩu và OTP không được trả về.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách người dùng thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: [
          {
            id: 2,
            username: 'admin-vna',
            fullName: 'Nguyễn Văn A',
            email: 'phanthanhthung093@gmail.com',
            roleId: 2,
            enterpriseId: null,
            isActive: true,
            createdAt: '2026-10-22T08:00:00.000Z',
            updatedAt: '2026-10-22T08:00:00.000Z',
          },
        ],
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập.',
  })
  async getAllUsers() {
    return this.userService.getAllUsers();
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
    return this.userService.getMyProfile(user.id);
  }

  // ─── XEM CHI TIẾT NGƯỜI DÙNG THEO ID (QUẢN TRỊ VIÊN) ─────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết người dùng theo ID (Quản trị viên)',
    description:
      'Trả về toàn bộ thông tin chi tiết của người dùng theo ID để hiển thị trên màn hình Chi tiết / Chỉnh sửa người dùng.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID người dùng cần xem chi tiết',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin chi tiết người dùng thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          id: 2,
          username: 'Vna25112020',
          fullName: 'Phan Thanh Tùng',
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
          roleId: 1,
          enterpriseId: null,
          isActive: true,
          createdAt: '2026-10-22T08:00:00.000Z',
          updatedAt: '2026-10-22T08:00:00.000Z',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy người dùng.',
  })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  // ─── CẬP NHẬT THÔNG TIN TÀI KHOẢN (BẢN THÂN) ──────────────────────────────
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
          enterpriseId: null,
          isActive: true,
          createdAt: '2026-10-18T10:00:00.000Z',
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
    return this.userService.updateProfile(user.id, dto);
  }

  // ─── CẬP NHẬT NGƯỜI DÙNG THEO ID (QUẢN TRỊ VIÊN) ────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật người dùng theo ID (Quản trị viên)',
    description:
      'Quản trị viên có thể cập nhật thông tin cá nhân, phân quyền (roleId), ' +
      'doanh nghiệp (enterpriseId), trạng thái hoạt động (isActive), email và đặt lại mật khẩu.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID người dùng cần cập nhật',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin người dùng thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          id: 2,
          username: 'admin-vna',
          fullName: 'Nguyễn Văn A (Đã cập nhật)',
          dob: '1995-06-01',
          gender: 1,
          email: 'admin.updated@example.com',
          phoneNumber: '0901234567',
          title: 'Chuyên viên cao cấp',
          avatarUrl: 'https://example.com/avatar.jpg',
          provinceId: '79',
          districtId: '764',
          wardId: '26740',
          address: 'Phường Gò Vấp, TP Hồ Chí Minh',
          roleId: 2,
          enterpriseId: null,
          isActive: true,
          createdAt: '2026-10-22T08:00:00.000Z',
          updatedAt: '2026-10-25T08:00:00.000Z',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu cập nhật không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy người dùng.',
  })
  @ApiResponse({
    status: 409,
    description: 'Email đã tồn tại trong hệ thống.',
  })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, dto, user?.id);
  }

  // ─── CẬP NHẬT TRẠNG THÁI HOẠT ĐỘNG (QUẢN TRỊ VIÊN) ─────────────────────
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật trạng thái hoạt động (isActive) của người dùng (Quản trị viên)',
    description:
      'Quản trị viên kích hoạt hoặc khóa tài khoản người dùng. Không cho phép tự khóa tài khoản của chính mình.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID người dùng cần cập nhật trạng thái',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái hoạt động thành công.',
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
          isActive: false,
          createdAt: '2026-10-22T08:00:00.000Z',
          updatedAt: '2026-10-25T13:00:00.000Z',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tự khóa tài khoản của chính mình.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy người dùng.',
  })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userService.updateStatus(id, dto.isActive, user?.id);
  }
}
