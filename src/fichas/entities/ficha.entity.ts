import { Programa } from '../../programas/entities/programa.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('ficha')
export class Ficha {
  // en la BD `codigo` es PK pero no autoincrement
  @PrimaryColumn({ type: 'int' })
  codigo: number;

  @ManyToOne(() => Programa, (programa) => programa.fichas, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'programaId' })
  programa: Programa;

  @OneToMany(() => Usuario, (usuario) => usuario.ficha)
  usuarios: Usuario[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}
