import { IsString } from 'class-validator'

export class ValidarBrokerDto {
  @IsString()
  url: string

  @IsString()
  usuario: string

  @IsString()
  contrasena: string
}
