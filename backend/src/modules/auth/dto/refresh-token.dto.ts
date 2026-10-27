import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token trong body; không bắt buộc nếu đã gửi bằng cookie',
    example: 'abc123...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
