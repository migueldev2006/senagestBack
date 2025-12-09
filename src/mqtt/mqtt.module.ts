import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { BrokerConfigModule } from '../psicultura/Broker/broker-config.module';

@Module({
  imports: [forwardRef(() => BrokerConfigModule)],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
