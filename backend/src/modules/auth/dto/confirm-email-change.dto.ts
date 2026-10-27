import { IsEmail, IsNotEmpty, IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmEmailChangeDto {
  @ApiProperty({
    description: 'Email mới cần cập nhật',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail: string;

  @ApiProperty({
    description: 'Mã OTP đã xác minh',
    example: '123456',
  })
  @IsNumberString({}, { message: 'OTP phải là chuỗi số' })
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;
}
