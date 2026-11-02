import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;

export class RequestRegisterEnterpriseOtpDto {
  @ApiProperty({
    example: 'contact@company.vn',
    description: 'Email liên hệ của doanh nghiệp (dùng nhận mã OTP)',
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
    example: '0312345678',
    description: 'Mã số thuế doanh nghiệp (10 số hoặc 13 số)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã số thuế không được để trống.' })
  @Matches(TAX_CODE_RE, {
    message:
      'Mã số thuế không hợp lệ. Vui lòng nhập 10 chữ số (hoặc 13 số dạng 10 số - 3 số).',
  })
  taxCode: string;
}
