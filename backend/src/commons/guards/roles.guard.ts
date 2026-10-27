import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../constants/error-codes.js';
import type { RoleCode } from '../constants/role-codes.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

type AuthenticatedUser = {
  roleCode?: string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const roleCode = request.user?.roleCode;

    if (!roleCode || !requiredRoles.includes(roleCode as RoleCode)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Bạn không có quyền thực hiện thao tác này.',
      });
    }

    return true;
  }
}
