import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../usuarios/entities/usuario.entity';
import { ProblemDetailsException } from '../../../common/exceptions/problem-details.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.rol) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/forbidden',
          title: 'Forbidden',
          status: HttpStatus.FORBIDDEN,
          code: 'FORBIDDEN',
          detail: 'No se encontraron roles de usuario en el token.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userRoleStr = String(user.rol).toLowerCase();
    const hasRole = requiredRoles.some((role) => {
      const requiredStr = String(role).toLowerCase();
      return (
        userRoleStr === requiredStr ||
        (userRoleStr.includes('admin') && requiredStr.includes('admin'))
      );
    });

    if (!hasRole) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/forbidden',
          title: 'Forbidden',
          status: HttpStatus.FORBIDDEN,
          code: 'FORBIDDEN',
          detail: 'Acceso restringido: requiere privilegios de Administrador.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
