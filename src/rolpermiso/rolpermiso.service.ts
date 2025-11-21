import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolPermiso } from './entities/rolpermiso.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { Permiso } from 'src/permisos/entities/permiso.entity';
import { Rol } from 'src/roles/entities/rol.entity';

@Injectable()
export class RolpermisoService {
  constructor(
    @InjectRepository(RolPermiso)
    private rolPermisoRepo: Repository<RolPermiso>,

    @InjectRepository(Modulo)
    private moduloRepo: Repository<Modulo>,

    @InjectRepository(Permiso)
    private permisoRepo: Repository<Permiso>,
    @InjectRepository(Rol)
    private rolRepo: Repository<Rol>,
  ) {}

  async asignPermiso(permisoId: number, rolId: number, valor: boolean) {
    // Buscar por relaciones
    const existing = await this.rolPermisoRepo.findOne({
      where: {
        permiso: { id: permisoId },
        rol: { id: rolId },
      },
      relations: ['permiso', 'rol'],
    });

    if (!existing) {
      const permiso = await this.permisoRepo.findOneBy({ id: permisoId });
      const rol = await this.rolPermisoRepo.manager
        .getRepository(Rol)
        .findOneBy({ id: rolId });

      if (!permiso || !rol) {
        throw new Error('permiso o rol no existen');
      }

      const newAsign = this.rolPermisoRepo.create({
        permiso,
        rol,
        valor,
      });

      await this.rolPermisoRepo.save(newAsign);

      return {
        status: 201,
        message: 'Permiso assigned successfully',
        data: newAsign,
      };
    }

    existing.valor = valor;
    await this.rolPermisoRepo.save(existing);

    return {
      status: 200,
      message: 'Permiso updated successfully',
      data: existing,
    };
  }

  async getRolePermisos(rolId: number) {
    const modulos = await this.moduloRepo.find({
      relations: ['rutas', 'rutas.permisos'],
    });

    const asignados = await this.rolPermisoRepo.find({
      where: {
        rol: { id: rolId },
      },
      relations: ['permiso'],
    });

    const permisoMap = new Map(asignados.map((p) => [p.permiso.id, p.valor]));

    const mapped = modulos.map((m) => {
      const permisos = m.rutas.flatMap((r) =>
        r.permisos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          checked: permisoMap.get(p.id) ?? false,
        })),
      );

      return {
        id: m.id,
        nombre: m.nombre,
        icono: m.icono,
        permisos,
      };
    });

    return {
      status: 200,
      message: 'Permisos by rol fetched successfully',
      data: mapped,
    };
  }
}
