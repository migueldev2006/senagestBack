import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("broker_config")
export class BrokerConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column()
  port: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: "timestamp", default: () => "NOW()" })
  created_at: Date;

  @Column({ type: "timestamp", default: () => "NOW()" })
  updated_at: Date;
  tls: any;
}
