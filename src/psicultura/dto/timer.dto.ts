import { IsString } from 'class-validator'

export class TimerDto {
  @IsString()
  TiempoEncendido: string

  @IsString()
  tiempoApagado: string
}
