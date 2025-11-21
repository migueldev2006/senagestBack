import { Modulo } from '../../modulos/entities/modulo.entity';
import { Permiso } from '../../permisos/entities/permiso.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('rutafront')
export class RutaFront {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  ruta: string;

  @ManyToOne(() => Modulo, (modulo) => modulo.rutas, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'moduloId' })
  modulo: Modulo;

  @OneToMany(() => Permiso, (permiso) => permiso.ruta)
  permisos: Permiso[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}