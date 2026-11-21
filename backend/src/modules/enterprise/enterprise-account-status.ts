import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { IsNull, type EntityManager } from 'typeorm';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import { UserEntity } from '../user/user.entity.js';
import { EnterpriseEntity } from './enterprise.entity.js';

// Both entry points lock the enterprise first so concurrent changes cannot leave
// the enterprise and its one-to-one account with different activation states.
export async function synchronizeEnterpriseAccountStatus(
  manager: EntityManager,
  enterpriseId: number,
  isActive: boolean,
  updaterId?: number,
  userChanges: Partial<UserEntity> = {},
): Promise<void> {
  const enterprise = await manager.findOne(EnterpriseEntity, {
    where: { id: enterpriseId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!enterprise) {
    throw new NotFoundException({
      code: ErrorCode.ENTERPRISE_NOT_FOUND,
      message: 'Không tìm thấy doanh nghiệp liên kết.',
    });
  }
  const account = await manager.findOne(UserEntity, {
    where: { enterpriseId },
    select: { id: true },
  });
  if (!account && Object.keys(userChanges).length > 0) {
    throw new NotFoundException('Không tìm thấy tài khoản liên kết.');
  }
  if (!isActive && updaterId !== undefined && account?.id === updaterId) {
    throw new BadRequestException(
      'Bạn không thể tự khóa tài khoản của chính mình.',
    );
  }
  const status = { isActive, updatedBy: updaterId ?? null };
  await manager.update(EnterpriseEntity, enterpriseId, status);
  const result = await manager.update(
    UserEntity,
    { enterpriseId, deletedAt: IsNull() },
    { ...userChanges, ...status },
  );
  if (account && result.affected !== 1) {
    throw new ConflictException(
      'Tài khoản liên kết đã được thay đổi. Vui lòng tải lại dữ liệu.',
    );
  }
}
