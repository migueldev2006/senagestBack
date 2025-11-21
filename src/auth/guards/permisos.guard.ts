import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISO_KEY } from '../decorators/permisos.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';



@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    @InjectRepository(RolPermiso)
    private readonly rolPermisoRepo: Repository<RolPermiso>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permisos: number[] =
      this.reflector.get<number[]>(PERMISO_KEY, context.getHandler());

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new HttpException('Not logged in', HttpStatus.UNAUTHORIZED);
    }

    if (!permisos || permisos.length === 0) return true;

    const permisosDelRol = await this.rolPermisoRepo
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.permiso', 'permiso')
      .leftJoinAndSelect('rp.rol', 'rol')
      .where('rp.rolId = :rolId', { rolId: user.rolId })
      .andWhere('rp.permisoId IN (:...permisos)', { permisos })
      .andWhere('rp.valor = true')
      .andWhere('permiso.estado = true')
      .andWhere('rol.estado = true')
      .getMany();

    if (permisosDelRol.length > 0) return true;

    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }
}


