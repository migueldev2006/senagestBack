import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateModuloDto {
    @IsString()
    @MinLength(3)
    nombre : string;

    @IsString()
    @MinLength(10)
    descripcion : string;

    @IsString()
    @IsOptional()
    icono : string;
}