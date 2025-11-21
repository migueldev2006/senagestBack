
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { TipoPermiso } from "src/enums/tipo-permiso.enum";

export class CreatePermisoDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    nombre : string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    descripcion : string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @IsEnum(TipoPermiso)
    tipo? : TipoPermiso

    @IsNotEmpty()
    @IsNumber()
    rutaId : number

}