import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsBoolean,
  IsOptional,
  IsEmail,
  Length,
  IsNumberString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';

// ─── ĐĂNG NHẬP ───────────────────────────────────────────────────────────────
export class LoginDto {
  @ApiProperty({ description: 'Tên đăng nhập', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin.' })
  username: string;

  @ApiProperty({ description: 'Mật khẩu', example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin.' })
  password: string;

  @ApiPropertyOptional({
    description: 'Ghi nhớ đăng nhập (token có hiệu lực 30 ngày thay vì 8 giờ)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

// ─── ĐỔI MẬT KHẨU (khi đã đăng nhập) ────────────────────────────────────────
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Mật khẩu hiện tại',
    example: 'admin1234',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;



  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
    example: 'admin123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;

  @ApiProperty({
    description: 'Xác nhận mật khẩu mới',
    example: 'admin123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới' })
  confirmNewPassword: string;
}

// ─── QUÊN MẬT KHẨU – BƯỚC 1: Nhập email ─────────────────────────────────────
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email đã đăng ký trong hệ thống',
    example: 'user@example.com',
  })
  @IsEmail(
    {},
    {
      message:
        'Vui lòng nhập đúng định dạng email (ví dụ: username@domain.com). ' +
        'Chỉ chấp nhận các ký tự: chữ cái, chữ số, dấu chấm (.), gạch ngang (-), gạch dưới (_).',
    },
  )
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

// ─── QUÊN MẬT KHẨU – BƯỚC 2: Xác nhận OTP + Đặt mật khẩu mới ───────────────
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email đã nhập ở bước 1 (để xác định tài khoản)',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Vui lòng nhập đúng định dạng email' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    description: 'Mã OTP 6 chữ số đã được gửi đến email',
    example: '123456',
  })
  @IsNumberString({}, { message: 'OTP phải là chuỗi số' })
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
    example: 'NewPass@2024',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;

  @ApiProperty({
    description: 'Nhập lại mật khẩu mới để xác nhận',
    example: 'NewPass@2024',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới' })
  confirmNewPassword: string;
}

// ─── EMAIL CHANGE – BƯỚC 1: Yêu cầu gửi OTP ─────────────────────────────────
export class RequestEmailChangeDto {
  // Không cần body – userId lấy từ JWT token
}

// ─── EMAIL CHANGE – BƯỚC 2: Xác nhận OTP ────────────────────────────────────
export class VerifyEmailOtpDto {
  @ApiProperty({ description: 'Mã OTP 6 số được gửi về email cũ', example: '123456' })
  @IsNumberString({}, { message: 'OTP phải là chuỗi số' })
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;
}

// ─── EMAIL CHANGE – BƯỚC 3: Xác nhận email mới ───────────────────────────────
export class ConfirmEmailChangeDto {
  @ApiProperty({ description: 'Email mới cần cập nhật', example: 'newemail@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail: string;

  @ApiProperty({ description: 'Mã OTP đã xác minh ở bước 2', example: '123456' })
  @IsNumberString({}, { message: 'OTP phải là chuỗi số' })
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;
}
