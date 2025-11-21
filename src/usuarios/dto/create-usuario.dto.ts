import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsEmail, MinLength, IsNumber, IsDateString, IsOptional, IsISO8601 } from "class-validator";

export class CreateUsuarioDto {

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    identificacion : number;

    @IsString()
    @IsNotEmpty()
    primerNombre: string;

    @IsString()
    @IsOptional()
    segundoNombre?: string;

    @IsString()
    @IsNotEmpty()
    primerApellido: string;

    @IsString()
    @IsOptional()
    segundoApellido?: string;

    @IsEmail()
    @IsNotEmpty()
    correo: string;

    @IsNotEmpty()
    @IsISO8601()
    fechaNacimiento: Date;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    fichaId?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    rolId?: number;

    @IsOptional()
    img?: any;
}