import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyRegisterEnterpriseOtpDto {
  @ApiProperty({
    example: 'contact@company.vn',
    description: 'Email doanh nghiệp đã đăng ký nhận mã OTP',
  })
  @IsEmail(
    {},
    {
      message:
        'Vui lòng nhập đúng định dạng email (ví dụ: username@domain.com).',
    },
  )
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @MaxLength(100)
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP 6 chữ số nhận qua email',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP.' })
  @Matches(/^\d{6}$/, { message: 'Mã OTP phải gồm đúng 6 chữ số.' })
  otp: string;
}
