import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';
import { Public } from '../../commons/decorators/public.decorator.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard.js';

@ApiTags('Auth – Xác thực')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  // ─── 1. ĐĂNG NHẬP ─────────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập hệ thống',
    description:
      'Xác thực tài khoản, thiết lập HttpOnly cookie (access_token, refresh_token) và trả về thông tin người dùng.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Đăng nhập thành công. Token được lưu trong HttpOnly cookie an toàn; trả về thông tin user.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          user: {
            id: 1,
            username: 'admin',
            fullName: 'Quản trị viên',
            email: 'admin@example.com',
            roleId: 1,
            avatarUrl: null,
            isActive: true,
          },
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bỏ trống tên đăng nhập hoặc mật khẩu.',
    schema: {
      example: {
        message: 'Vui lòng nhập đầy đủ thông tin.',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/login',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Tài khoản hoặc mật khẩu không đúng.',
    schema: {
      example: {
        message: 'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại.',
        success: false,
        data: null,
        code: 401,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/login',
      },
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Gắn HttpOnly cookies an toàn cho access_token và refresh_token
    this.authCookieService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessExpiresIn: result.expiresIn,
      rememberMe: dto.rememberMe,
      refreshMaxAgeMs: result.refreshExpiresInSeconds
        ? result.refreshExpiresInSeconds * 1000
        : undefined,
    });

    // Trả về thông tin người dùng (không để lộ raw token trong response body)
    return {
      user: result.user,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin người dùng đang đăng nhập',
    description:
      'Frontend gọi khi mở app để biết phiên đăng nhập (cookie HttpOnly) còn hiệu lực không.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phiên còn hiệu lực.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          id: 1,
          username: 'admin',
          fullName: 'Quản trị viên',
          email: 'admin@example.com',
          roleId: 1,
          enterpriseId: null,
          avatarUrl: null,
          isActive: true,
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc phiên đã hết hạn.',
    schema: {
      example: {
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
        success: false,
        data: null,
        code: 'UNAUTHORIZED',
        statusCode: 401,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/me',
      },
    },
  })
  me(@CurrentUser() user: { id: number }) {
    return this.authService.getMe(user.id);
  }

  // ─── 2. ĐĂNG XUẤT ─────────────────────────────────────────────────────────
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất',
    description:
      'Thu hồi access token (blacklist jti) và refresh token trong Redis, đồng thời xóa sạch cookie xác thực.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Đăng xuất thành công. Xóa cookie và thu hồi token trong Redis.',
    schema: {
      example: {
        message: 'Đăng xuất thành công.',
        success: true,
        data: {
          message: 'Đăng xuất thành công.',
          action: 'CLEAR_TOKEN',
        },
        code: 200,
      },
    },
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawAccessToken = this.authCookieService.extractAccessToken(req);
    const rawRefreshToken = this.authCookieService.extractRefreshToken(req);

    // Thu hồi token trong Redis (nếu có)
    await this.authService.logout(null, rawAccessToken, rawRefreshToken);

    // Xóa cookies khỏi trình duyệt
    this.authCookieService.clearAuthCookies(res);

    return {
      message: 'Đăng xuất thành công.',
      action: 'CLEAR_TOKEN',
    };
  }

  // ─── 2b. LÀM MỚI ACCESS TOKEN ────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới access token',
    description:
      'Dùng refresh token từ HttpOnly cookie (hoặc body) để cấp lại cặp token mới (xoay vòng). ' +
      'Refresh token cũ bị hủy trong Redis và các cookie mới được gắn vào response.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cấp token mới thành công qua HttpOnly cookies.',
    schema: {
      example: {
        message: 'Cấp token mới thành công.',
        success: true,
        data: {
          message: 'Cấp token mới thành công.',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc đã hết hạn.',
    schema: {
      example: {
        message: 'Refresh token không hợp lệ. Vui lòng đăng nhập lại.',
        success: false,
        data: null,
        code: 401,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/refresh',
      },
    },
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ) {
    const refreshToken = this.authCookieService.extractRefreshToken(
      req,
      dto?.refreshToken,
    );

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Không tìm thấy refresh token. Vui lòng đăng nhập lại.',
      );
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // Cập nhật cặp cookie mới (xoay vòng token)
    this.authCookieService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessExpiresIn: result.expiresIn,
      refreshMaxAgeMs: result.refreshExpiresInSeconds
        ? result.refreshExpiresInSeconds * 1000
        : undefined,
    });

    return {
      message: 'Cấp token mới thành công.',
    };
  }

  // ─── 3. ĐỔI MẬT KHẨU (khi đã đăng nhập) ─────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description:
      'Sau khi đổi thành công, toàn bộ token cũ bị vô hiệu hóa trong Redis và cookie bị xóa bỏ.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Đổi mật khẩu thành công. action=FORCE_LOGOUT báo client đăng xuất.',
    schema: {
      example: {
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        success: true,
        data: {
          message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
          action: 'FORCE_LOGOUT',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Mật khẩu cũ sai / Mật khẩu mới không khớp / Trùng mật khẩu cũ',
    schema: {
      example: {
        message: 'Mật khẩu hiện tại không đúng',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/change-password',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token đã hết hạn',
    schema: {
      example: {
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
        success: false,
        data: null,
        code: 401,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/change-password',
      },
    },
  })
  async changePassword(
    @CurrentUser() user: { id: number },
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);

    // Xóa cookies để bắt buộc đăng nhập lại
    this.authCookieService.clearAuthCookies(res);

    return result;
  }
  // ─── 4. QUÊN MẬT KHẨU – BƯỚC 1: Gửi OTP ──────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      '[Forgot Password – Step 1] Gửi mã OTP khôi phục mật khẩu qua email',
    description: 'Kiểm tra email trong hệ thống và gửi mã OTP 6 số qua email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi mã OTP thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          message: 'Gửi email thành công.',
          expiresInMinutes: 5,
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Lỗi xác thực dữ liệu đầu vào (Validation Error: Email không đúng định dạng hoặc để trống).',
    schema: {
      example: {
        message:
          'Vui lòng nhập đúng định dạng email (ví dụ: username@domain.com).',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/forgot-password',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Không tìm thấy tài khoản (Email chưa được đăng ký trong hệ thống).',
    schema: {
      example: {
        message: 'Email chưa được đăng ký. Xin vui lòng thử lại.',
        success: false,
        data: null,
        code: 404,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/forgot-password',
      },
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ─── 4b. QUÊN MẬT KHẨU – BƯỚC 2: Xác nhận OTP + Đặt mật khẩu mới ─────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Forgot Password – Step 2] Xác nhận OTP và đặt mật khẩu mới',
    description:
      'Người dùng cung cấp: email, OTP 6 số, mật khẩu mới và xác nhận mật khẩu. ' +
      'Sau khi thành công, trả về action=REDIRECT_TO_LOGIN để chuyển hướng về trang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Khôi phục thành công. Báo client chuyển về màn hình đăng nhập.',
    schema: {
      example: {
        message:
          'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
        success: true,
        data: {
          message:
            'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
          action: 'REDIRECT_TO_LOGIN',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Mã OTP không đúng, đã hết hạn hoặc mật khẩu xác nhận không khớp.',
    schema: {
      example: {
        message: 'Mã OTP không chính xác hoặc đã hết hạn',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/reset-password',
      },
    },
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithOtp(dto);
  }

  // ─── 5. THAY ĐỔI EMAIL – BƯỚC 1: Gửi OTP về email cũ ────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Email Change – Step 1] Gửi OTP về email hiện tại để xác thực',
    description:
      'Gửi mã OTP 6 số về email hiện tại của tài khoản đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mã OTP đã được gửi về email hiện tại.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          message:
            'Mã OTP đã được gửi đến email hiện tại của bạn. Vui lòng kiểm tra hộp thư.',
          expiresInMinutes: 5,
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Tài khoản chưa có email để gửi OTP.',
    schema: {
      example: {
        message: 'Tài khoản chưa có email để gửi mã OTP',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/request-email-change',
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
        path: '/api/v1/auth/request-email-change',
      },
    },
  })
  requestEmailChangeOtp(@CurrentUser() user: { id: number }) {
    return this.authService.requestEmailChangeOtp(user.id);
  }

  // ─── 6. THAY ĐỔI EMAIL – BƯỚC 2: Xác minh OTP ───────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('verify-email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Email Change – Step 2] Xác minh mã OTP 6 số',
    description: 'Xác minh mã OTP người dùng nhận được ở bước 1.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP hợp lệ. Có thể tiến hành nhập email mới.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          message:
            'Xác thực mã OTP thành công. Bạn có thể tiến hành đổi email.',
          verified: true,
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'OTP sai hoặc đã hết hạn.',
    schema: {
      example: {
        message: 'Mã OTP không chính xác hoặc đã hết hạn',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/verify-email-otp',
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
        path: '/api/v1/auth/verify-email-otp',
      },
    },
  })
  verifyEmailOtp(
    @CurrentUser() user: { id: number },
    @Body() dto: VerifyEmailOtpDto,
  ) {
    return this.authService.verifyEmailOtp(user.id, dto);
  }

  // ─── 7. THAY ĐỔI EMAIL – BƯỚC 3: Xác nhận email mới ─────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Email Change – Step 3] Nhập email mới và lưu vào hệ thống',
    description: 'Gửi kèm OTP đã xác minh ở bước 2 để bảo vệ endpoint này.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật email thành công.',
    schema: {
      example: {
        message: 'Thành công',
        success: true,
        data: {
          message: 'Cập nhật email thành công.',
          newEmail: 'newemail@example.com',
        },
        code: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không hợp lệ hoặc đã hết hiệu lực.',
    schema: {
      example: {
        message: 'Mã OTP không hợp lệ.',
        success: false,
        data: null,
        code: 400,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/confirm-email-change',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      'Xung đột dữ liệu – Email mới đã được sử dụng bởi tài khoản khác.',
    schema: {
      example: {
        message: 'Email này đã được sử dụng bởi tài khoản khác.',
        success: false,
        data: null,
        code: 409,
        timestamp: '2026-10-18T16:00:00.000Z',
        path: '/api/v1/auth/confirm-email-change',
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
        path: '/api/v1/auth/confirm-email-change',
      },
    },
  })
  confirmEmailChange(
    @CurrentUser() user: { id: number },
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    return this.authService.confirmEmailChange(user.id, dto);
  }
}
