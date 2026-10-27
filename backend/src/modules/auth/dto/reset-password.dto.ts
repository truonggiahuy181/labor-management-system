import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email đã nhập ở bước yêu cầu OTP',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Vui lòng nhập đúng định dạng email' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ description: 'Mã OTP gồm 6 chữ số', example: '123456' })
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

  @ApiPropertyOptional({
    description: 'Nhập lại mật khẩu mới để xác nhận',
    example: 'NewPass@2024',
  })
  @IsOptional()
  @IsString()
  confirmNewPassword?: string;
}
