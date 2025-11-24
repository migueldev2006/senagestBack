import { TipoPermiso } from '../../../src/enums/tipo-permiso.enum';
import { RolPermiso } from '../../rolpermiso/entities/rolpermiso.entity';
import { RutaFront } from '../../rutas/entities/ruta.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('permiso')
export class Permiso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: TipoPermiso,
    default: TipoPermiso.read,
  })
  tipo: TipoPermiso;

  @Column()
  rutaId: number;

  @ManyToOne(() => RutaFront, (ruta) => ruta.permisos, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'rutaId' })
  ruta: RutaFront;

  @OneToMany(() => RolPermiso, (rp) => rp.permiso)
  roles: RolPermiso[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}
