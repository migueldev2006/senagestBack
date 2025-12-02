import { IsString } from 'class-validator'

export class TimerDto {
  @IsString()
  tiempoEncendido?: string

  @IsString()
  tiempoApagado?: string
}
