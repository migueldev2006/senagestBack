import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BrokerConfig } from "./entities/broker-config.entity";

@Injectable()
export class BrokerConfigService {
 async getAllConfigs(): Promise<BrokerConfig[]> {
  return this.repo.find();
}

  constructor(
    @InjectRepository(BrokerConfig)
    private repo: Repository<BrokerConfig>
  ) {}

  async setConfig(data: { url: string; port: number; username: string; password: string }) {
  await this.repo.update({ active: true }, { active: false });

  const config = this.repo.create({
    url: data.url,
    port: data.port,
    username: data.username,
    password: data.password,
  });
  if (!data.url || !data.port || !data.username || !data.password) {
  throw new Error("Todos los campos son obligatorios: url, port, username, password");
}


  return this.repo.save(config);
}


  async getActiveConfig(): Promise<BrokerConfig | null> {
    return this.repo.findOne({ where: { active: true } });
  }
}
