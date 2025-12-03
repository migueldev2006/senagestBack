import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Psicultura } from './psicultura.entity';

@Entity('psicultura_data')
export class PsiculturaData {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Psicultura, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'psiculturaId' })
  psicultura: Psicultura;

  @Column({ type: 'varchar', length: 200 })
  topico: string;

  @Column({ type: 'text' })
  payload: string;

  @Column({ type: 'jsonb', nullable: true })
  dataParsed: any;

  @Column({ type: 'float', nullable: true })
  temperatura: number | null;

  @Column({ type: 'float', nullable: true })
  humedad: number | null;

  @Column({ type: 'float', nullable: true })
  oxigeno: number | null;

  @Column({ type: 'float', nullable: true })
  ph: number | null;

  @Column({ type: 'float', nullable: true })
  conductividad: number | null;

  @Column({ type: 'boolean', nullable: true })
  s1: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  s2: boolean | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;
}
