import { Body, Controller, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ProgramasService } from './programas.service';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';

@Controller('programas')
export class ProgramasController {

    constructor(private programasService : ProgramasService){}

    @Post()
    @UseGuards(AuthGuard('jwt'),RolesGuard, PermisosGuard)
    @Roles()
    async createPrograma(@Body() data : CreateProgramaDto) {
        return await this.programasService.createPrograma(data);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'),RolesGuard, PermisosGuard)
    @Roles('Aprendiz')
    async getProgramas(@Query("page",ParseIntPipe) pageQuery : number | undefined){
        const page = pageQuery ?? 1;
        return await this.programasService.getProgramas(page);
    }
}