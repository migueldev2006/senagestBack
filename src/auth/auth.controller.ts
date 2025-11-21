import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('login')
    async login(@Body() body : LoginDto) : Promise<any> {
        return await this.authService.login(body);
    }

    @Get('getpermisos')
    @UseGuards(AuthGuard('jwt'))
    async refetchPermisos(@Request() req: any){
        const rolId: number | undefined = req.user.rolId;
        
    if (!rolId) {
        throw new HttpException(
            { status: 400, message: 'El usuario no tiene un rol válido' },
            HttpStatus.BAD_REQUEST,
        );
    }
        return this.authService.refetchPermisos(rolId);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() {email} : {email: string}){
        return await this.authService.forgotPassword(email);
    }

    @Post('reset-password')
    async resetPassword(@Body() data: ResetPasswordDto){
        return await this.authService.resetPassword(data);
    }

    @Post('update-password')
    @UseGuards(AuthGuard('jwt'))
    async updatePassword(@Body() data: UpdatePasswordDto, @Req() req: any){
        const userId: number = req.user.sub;
        return await this.authService.updatePassword(data, userId);
    }
}
