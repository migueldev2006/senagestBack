import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('psicultura')
export class Psicultura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  url?: string;

  @Column({ type: 'varchar', length: 20 })
  usuario?: string;

  @Column({ type: 'varchar', length: 20 })
  contrasena?: string;

  @Column({ type: 'varchar', length: 8, default: '00:00:00' })
  TiempoEncendido?: string;

  @Column({ type: 'varchar', length: 8, default: '00:00:00' })
  tiempoApagado?: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  @Column({ type: 'boolean' })
  estado?: boolean;
}
