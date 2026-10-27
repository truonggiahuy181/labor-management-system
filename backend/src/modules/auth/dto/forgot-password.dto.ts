import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email đã đăng ký trong hệ thống',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Vui lòng nhập đúng định dạng email' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
