import { RutaFront } from '../../rutas/entities/ruta.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';

@Entity('modulo')
export class Modulo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'varchar', length: 191, default: 'Book' })
  icono: string;

  @OneToMany(() => RutaFront, (ruta) => ruta.modulo)
  rutas: RutaFront[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}