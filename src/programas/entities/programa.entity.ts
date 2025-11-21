import { Ficha } from '../../fichas/entities/ficha.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('programa')
export class Programa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  abreviacion: string;

  @OneToMany(() => Ficha, (ficha) => ficha.programa)
  fichas: Ficha[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;
}
