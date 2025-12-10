import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { Psicultura } from "../../entities/psicultura.entity";

export enum BrokerProtocol {
  MQTT = 'mqtt',
  WEBSOCKETS = 'websockets'
}

@Entity("broker_config")
export class BrokerConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  port: number;

  @Column({ type: 'enum', enum: BrokerProtocol, default: BrokerProtocol.MQTT })
  protocol: BrokerProtocol;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  base_topic: string;

  @Column({ default: false })
  is_active: boolean;

  @Column({ default: false })
  is_connected: boolean;

  @Column({ default: false })
  is_subscribed: boolean;

  @Column({ default: false })
  is_publishing: boolean;

  @Column({ type: "timestamp", default: () => "NOW()" })
  created_at: Date;

  @Column({ type: "timestamp", default: () => "NOW()" })
  updated_at: Date;

  @OneToMany(() => Psicultura, (psicultura) => psicultura.brokerConfig)
  psiculturas: Psicultura[];
}
