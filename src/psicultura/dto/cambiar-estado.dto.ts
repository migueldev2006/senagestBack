import { IsBoolean } from 'class-validator'

export class CambiarEstadoDto {
  @IsBoolean()
  estado: boolean
  @IsBoolean()
  manual: boolean
}
