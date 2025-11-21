import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModulosService } from './modulos.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { AuthGuard } from '@nestjs/passport';
import { Permiso } from 'src/auth/decorators/permisos.decorator';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';
import { UpdateModuloDto } from './dto/update-modulo.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('modulos')
export class ModulosController {
    constructor(private modulosService : ModulosService) {}


    @Post()
    @Permiso(1)
    @UseGuards(PermisosGuard)
    async createModulo(@Body() data : CreateModuloDto) {
        return await this.modulosService.createModulo(data);
    }

    @Get()
    @Permiso(2)
    @UseGuards(PermisosGuard)
    async getModulos(@Query('page',ParseIntPipe) pageQuery: number, @Query('search') search?: string) {
        const page = pageQuery ?? 1;
        return await this.modulosService.getModulos(page, search);
    }

    @Get("all")
    @Permiso(2,6,19)
    @UseGuards(PermisosGuard)
    async getAllModulos () {
        return await this.modulosService.getAllModulos();
    }

    @Patch('update/:id')
    @Permiso(3)
    @UseGuards(PermisosGuard)
    async updateModulo(@Param('id',ParseIntPipe) id: number, @Body() data: UpdateModuloDto) {
        return await this.modulosService.updateModulo(id,data);
    }

    @Patch('status/:id')
    @Permiso(4)
    @UseGuards(PermisosGuard)
    async updateStatus(@Param('id',ParseIntPipe) id: number) {
        return await this.modulosService.updateStatus(id);
    }
}
