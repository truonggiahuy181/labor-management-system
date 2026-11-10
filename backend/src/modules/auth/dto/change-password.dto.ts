import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại', example: 'admin1234' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  @Matches(/\S/u, { message: 'Mật khẩu hiện tại không được chỉ gồm khoảng trắng' })
  currentPassword: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
    example: 'admin123',
    minLength: 8,
  })
  @IsString()
  @Matches(/\S/u, { message: 'Mật khẩu mới không được chỉ gồm khoảng trắng' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;

  @ApiProperty({
    description: 'Xác nhận mật khẩu mới',
    example: 'admin123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới' })
  @Matches(/\S/u, { message: 'Mật khẩu xác nhận không được chỉ gồm khoảng trắng' })
  confirmNewPassword: string;
}
