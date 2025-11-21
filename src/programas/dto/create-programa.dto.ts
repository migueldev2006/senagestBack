import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProgramaDto {

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    nombre : string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(6)
    abreviacion : string;
}