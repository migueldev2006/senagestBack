import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { CreateRutaDto } from './dto/create-ruta.dto';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';
import { Permiso } from 'src/auth/decorators/permisos.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UpdateRutaDto } from './dto/update-ruta.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('rutas')
export class RutasController {
    constructor(private rutasService : RutasService){}

    @Post()
    @Permiso(18)
    @UseGuards(PermisosGuard)
    async createRuta(@Body() data : CreateRutaDto) {
        return await this.rutasService.createRuta(data);
    }

    @Get('module/:id')
    @Permiso(19)
    @UseGuards(PermisosGuard)
    async getRutasByModule( @Param('id',ParseIntPipe) id: number, @Query("page",ParseIntPipe) pageQuery : number | undefined, @Query("search") search?: string) {
        const page = pageQuery ?? 1;
        return await this.rutasService.getRutasByModule(id, page, search);
    }

    @Get("all/module/:id")
    @Permiso(19,5)
    @UseGuards(PermisosGuard)
    async getAllRutasByModule (@Param('id',ParseIntPipe) id: number) {
        return await this.rutasService.getAllRutasByModule(id);
    }

    @Patch('update/:id')
    @Permiso(20)
    @UseGuards(PermisosGuard)
    async updateRuta(@Param('id',ParseIntPipe) id: number, @Body() data : UpdateRutaDto) {
        return await this.rutasService.updateRuta(id,data);
    }

    @Patch('status/:id')
    @Permiso(21)
    @UseGuards(PermisosGuard)
    async updateStatus(@Param('id',ParseIntPipe) id: number) {
        return await this.rutasService.updateStatus(id);
    }
}
