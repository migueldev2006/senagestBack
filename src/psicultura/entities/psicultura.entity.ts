import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('psicultura')
export class Psicultura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  url: string;

  @Column({ type: 'varchar', length: 20 })
  usuario: string;

  @Column({ type: 'varchar', length: 20 })
  contrasena: string;

  @Column({ type: 'varchar', length: 8, default: '00:00:00' })
  tiempoEncendido: string;

  @Column({ type: 'varchar', length: 8, default: '00:00:00' })
  tiempoApagado: string;

  @Column({ type: 'boolean', default: false })
  estado: boolean;

  @Column({ type: 'varchar', length: 20, default: 'inactivo' })
  estadoActual: string;

  @Column({ type: 'varchar', length: 10, default: 'auto' })
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

  @Column({ type: 'boolean', default: true })
  energiaEstable: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaFalloEnergia: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaRestablecidaEnergia: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  fechaActualizacion: Date;
}
