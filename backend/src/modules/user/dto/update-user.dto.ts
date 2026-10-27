import {
  IsOptional,
  IsBoolean,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateProfileDto } from './update-profile.dto.js';

export class UpdateUserDto extends UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Email liên hệ',
    example: 'user@example.com',
    maxLength: 100,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(100, { message: 'Email không được vượt quá 100 ký tự' })
  email?: string;

  @ApiPropertyOptional({
    description:
      'Mật khẩu mới (tối thiểu 8 ký tự, dành cho Quản trị viên muốn đặt lại mật khẩu cho người dùng)',
    example: 'NewPassword123',
    minLength: 8,
  })
  @IsOptional()
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt tài khoản',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là boolean' })
  isActive?: boolean;
}
