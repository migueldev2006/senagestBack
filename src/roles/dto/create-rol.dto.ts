import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateRolDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    nombre : string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(255)
    descripcion : string;

    @IsString()
    @IsNotEmpty()
    icono : string;
}