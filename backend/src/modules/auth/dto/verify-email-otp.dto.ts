import { IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailOtpDto {
  @ApiProperty({
    description: 'Mã OTP 6 số được gửi về email cũ',
    example: '123456',
  })
  @IsNumberString({}, { message: 'OTP phải là chuỗi số' })
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;
}
