import { IsNotEmpty, IsNumber, IsString, MaxLength, Min, MinLength } from "class-validator"

export class CreateRutaDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(30)
    nombre: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    ruta: string;

    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    moduloId: number;
}