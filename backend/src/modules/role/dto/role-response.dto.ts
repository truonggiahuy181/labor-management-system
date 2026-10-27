import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'ENTERPRISE_USER' })
  roleCode: string;

  @ApiProperty({ example: 'Người dùng doanh nghiệp' })
  roleName: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}
