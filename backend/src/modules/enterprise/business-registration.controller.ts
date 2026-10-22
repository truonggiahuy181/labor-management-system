import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../commons/decorators/public.decorator.js';
import {
  BusinessRegistrationService,
  MAX_UPLOAD_BYTES,
  type BusinessFiles,
} from './business-registration.service.js';
import {
  SendBusinessOtpDto,
  VerifyBusinessOtpDto,
  RegisterBusinessDto,
} from './dto/register-business.dto.js';

@ApiTags('Auth – Đăng ký doanh nghiệp')
@Public()
@Controller('auth/register-business')
export class BusinessRegistrationController {
  constructor(private readonly registrationService: BusinessRegistrationService) {}

  // ─── BƯỚC 1 ────────────────────────────────────────────────────────────────
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Đăng ký DN – Bước 1] Gửi OTP tới email doanh nghiệp',
    description: 'Kiểm tra trùng mã số thuế / email trước khi gửi. Gửi lại sau tối thiểu 60 giây.',
  })
  @ApiResponse({ status: 200, description: 'Đã gửi OTP.' })
  @ApiResponse({ status: 409, description: 'TAX_CODE_EXISTS / EMAIL_EXISTS' })
  sendOtp(@Body() dto: SendBusinessOtpDto) {
    return this.registrationService.sendOtp(dto);
  }

  // ─── BƯỚC 2 ────────────────────────────────────────────────────────────────
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Đăng ký DN – Bước 2] Xác thực OTP',
    description: 'Trả về verifyToken (hiệu lực 30 phút) dùng cho bước 3.',
  })
  @ApiResponse({ status: 200, description: '{ verifyToken }' })
  @ApiResponse({ status: 400, description: 'OTP_INVALID / OTP_EXPIRED / OTP_TOO_MANY_ATTEMPTS' })
  verifyOtp(@Body() dto: VerifyBusinessOtpDto) {
    return this.registrationService.verifyOtp(dto);
  }

  // ─── BƯỚC 3 ────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '[Đăng ký DN – Bước 3] Gửi hồ sơ và file đính kèm',
    description:
      'multipart/form-data: các trường thông tin + businessLicense (bắt buộc) + otherDocument. ' +
      'Chỉ nhận PDF/JPG/PNG, tối đa 10MB mỗi file. Tên đăng nhập = mã số thuế.',
  })
  @ApiResponse({ status: 200, description: '{ username, tempPassword, companyName, email }' })
  @ApiResponse({
    status: 400,
    description: 'VERIFY_TOKEN_INVALID / LICENSE_REQUIRED / INVALID_FILE_TYPE / FILE_TOO_LARGE',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'businessLicense', maxCount: 1 },
        { name: 'otherDocument', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_UPLOAD_BYTES } },
    ),
  )
  register(
    @Body() dto: RegisterBusinessDto,
    @UploadedFiles() files: BusinessFiles = {},
  ) {
    return this.registrationService.register(dto, files ?? {});
  }
}