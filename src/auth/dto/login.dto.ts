import { IsNotEmpty, IsString } from "class-validator";
import { IsEmailUnlessAdmin } from "./validator/IsEmailUnlessAdmin.validator";

export class LoginDto {
    
    @IsEmailUnlessAdmin()
    @IsNotEmpty()
    correo : string;

    @IsString()
    @IsNotEmpty()
    contrasena : string;
}