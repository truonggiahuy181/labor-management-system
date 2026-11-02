import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateEnterpriseDto } from '../../enterprise/dto/create-enterprise.dto.js';

export class RegisterEnterpriseDto extends CreateEnterpriseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Mã xác thực email (verifyToken) được cấp sau khi xác minh OTP',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực email (verifyToken) không được để trống.' })
  verifyToken: string;
}
