import { IsString } from 'class-validator'

export class ActualizarBrokerDto {
  @IsString()
  url: string

  @IsString()
  usuario: string

  @IsString()
  contrasena: string
}
