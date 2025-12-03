import { forwardRef, Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { PsiculturaModule } from '../psicultura.module';

@Module({
  imports: [forwardRef(() => PsiculturaModule)],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
