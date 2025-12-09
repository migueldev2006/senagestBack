import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Psicultura } from './psicultura.entity';

@Entity('psicultura_data')
export class PsiculturaData {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Psicultura, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'psiculturaId' })
  psicultura: Psicultura;

  @Column({ type: 'boolean', default: false })
  estado: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;
}
