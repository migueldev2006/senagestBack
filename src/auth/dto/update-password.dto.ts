import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class UpdatePasswordDto {

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    oldPassword : string;

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    newPassword : string;
    
}