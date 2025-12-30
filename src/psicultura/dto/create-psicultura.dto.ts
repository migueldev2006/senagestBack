import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator'

export class CreatePsiculturaDto {

  @IsOptional()
  @IsString()
  tiempoEncendido?: string

  @IsOptional()
  @IsString()
  tiempoApagado?: string

  @IsNumber()
  usuarios: number

  @IsOptional()
  @IsBoolean()
  estado?: boolean
}
