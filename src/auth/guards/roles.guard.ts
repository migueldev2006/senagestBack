import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.rol)
      throw new HttpException('Non existent user/role', HttpStatus.BAD_REQUEST);

    if (user.rol == 'Administrador') return true;

    const hasRole = requiredRoles.includes(user.rol);

    if (!hasRole)
      throw new HttpException(
        "You don't have permission to access this endpoint",
        HttpStatus.UNAUTHORIZED,
      );

    return true;
  }
}
