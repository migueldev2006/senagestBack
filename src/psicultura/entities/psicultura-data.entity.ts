import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Psicultura } from './psicultura.entity';

@Entity('psicultura_data')
export class PsiculturaData {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Psicultura, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'psiculturaId' })
  psicultura: Psicultura;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @Column({ type: 'varchar', length: 200 })
  topico: string;

  @Column({ type: 'varchar', length: 20, })
  modo: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;
}
