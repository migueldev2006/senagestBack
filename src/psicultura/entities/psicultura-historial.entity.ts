import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Psicultura } from './psicultura.entity';

@Entity('psicultura_historial')
export class PsiculturaHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Psicultura, (p) => p.historial, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psiculturaId' })
  psicultura: Psicultura;

  @Column({ type: 'boolean' })
  estado: boolean;

  @Column({ type: 'bigint', nullable: true })
  tiempoMs: number | null;

  @Column({ type: 'timestamp' })
  inicio: Date;

  @Column({ type: 'timestamp', nullable: true })
  fin: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  modo: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;
}
