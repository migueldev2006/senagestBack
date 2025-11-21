import { Ficha } from '../../fichas/entities/ficha.entity';
import { Rol } from '../../roles/entities/rol.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  identificacion: string; 

  @Column({ type: 'varchar', length: 20 })
  primerNombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  segundoNombre?: string;

  @Column({ type: 'varchar', length: 20 })
  primerApellido: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  segundoApellido?: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 60 })
  contrasena: string;

  @ManyToOne(() => Ficha, (ficha) => ficha.usuarios, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'fichaId' })
  ficha?: Ficha | null;

  @ManyToOne(() => Rol, (rol) => rol.usuarios, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'rolId' })
  rol?: Rol | null;

  @Column({ type: 'timestamp', precision: 3 })
  fechaNacimiento: Date;

  @Column({ type: 'varchar', length: 255, default: 'defaultpfp.png' })
  img: string;

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}
