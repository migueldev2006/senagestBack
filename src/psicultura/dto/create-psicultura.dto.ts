import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator'

export class CreatePsiculturaDto {
  @IsString()
  url: string

  @IsString()
  usuario: string

  @IsString()
  contrasena: string

  @IsOptional()
  @IsString()
  TiempoEncendido?: string

  @IsOptional()
  @IsString()
  tiempoApagado?: string

  @IsNumber()
  usuarioId: number

  @IsOptional()
  @IsBoolean()
  estado?: boolean
}
