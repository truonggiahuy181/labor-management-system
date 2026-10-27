import type { UserEntity } from '../user/user.entity.js';

export function canAuthenticate(user: UserEntity | null): user is UserEntity {
  if (!user?.isActive || !user.role?.isActive) {
    return false;
  }

  return user.enterpriseId === null || user.enterprise?.isActive === true;
}
