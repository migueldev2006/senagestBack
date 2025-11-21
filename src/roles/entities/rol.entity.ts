import { RolPermiso } from '../../rolpermiso/entities/rolpermiso.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'varchar', length: 30, default: 'User' })
  icono: string;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];

  @OneToMany(() => RolPermiso, (rp) => rp.rol)
  permisos: RolPermiso[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}