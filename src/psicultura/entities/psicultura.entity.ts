import { Usuario } from '../../usuarios/entities/usuario.entity';
import { BrokerConfig } from '../Broker/entities/broker-config.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { PsiculturaHistorial } from './psicultura-historial.entity';

@Entity('psicultura')
export class Psicultura {
  @PrimaryGeneratedColumn()
  id:number

  @Column({ type: 'varchar', length: 8, default: '00:00:00' })
  tiempoEncendido: string;

  @Column({ type: 'varchar', length: 8, default: '00:00:00' })
  tiempoApagado: string;

  @Column({ type: 'int', nullable: true })
  tiempoManualMs: number;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @Column({ type: 'varchar', length: 25, default: 'inactivo' })
  estadoActual: string;

  @Column({ type: 'varchar', length: 20, default: 'auto' })
  modo: string;

  @Column({ type: 'timestamp', nullable: true })
  ultimaActivacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  ultimaDesactivacion: Date;

  @Column({ type: 'boolean', default: true })
  conexionBroker: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaFalloConexion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaRestablecidaConexion: Date;


  /** Energía eléctrica */
  @Column({ type: 'boolean', default: true })
  energiaEstable: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaFalloEnergia: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaRestablecidaEnergia: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.psiculturas)
  usuarios: Usuario;

  @ManyToOne(() => BrokerConfig, (brokerConfig) => brokerConfig.psiculturas)
  brokerConfig: BrokerConfig;

  // relation to historial
  @OneToMany(() => PsiculturaHistorial, (h) => h.psicultura)
  historial: PsiculturaHistorial[];


  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;
}
