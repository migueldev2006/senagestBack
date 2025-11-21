import { Permiso } from '../../permisos/entities/permiso.entity';
import { Rol } from '../../roles/entities/rol.entity';
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('rolpermiso')
export class RolPermiso {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Permiso, (permiso) => permiso.roles, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'permisoId' })
  permiso: Permiso;

  @ManyToOne(() => Rol, (rol) => rol.permisos, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'rolId' })
  rol: Rol;

  @Column({ type: 'boolean', default: false })
  valor: boolean;
}
