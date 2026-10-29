import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEnterpriseDto } from './create-enterprise.dto.js';

// Mã số thuế là tên đăng nhập nên không cho đổi; email được đổi và đồng bộ sang tài khoản doanh nghiệp
export class UpdateEnterpriseDto extends PartialType(
  OmitType(CreateEnterpriseDto, ['taxCode'] as const),
) {}
