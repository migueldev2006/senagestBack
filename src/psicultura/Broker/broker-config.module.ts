import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BrokerConfig } from "./entities/broker-config.entity";
import { BrokerConfigService } from "./broker-config.service";
import { BrokerConfigController } from "./broker-config.controller";
import { MqttModule } from "../../mqtt/mqtt.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([BrokerConfig]),
    MqttModule,
  ],
  providers: [BrokerConfigService],
  controllers: [BrokerConfigController],
  exports: [BrokerConfigService],
})
export class BrokerConfigModule {}
export { MqttModule };

