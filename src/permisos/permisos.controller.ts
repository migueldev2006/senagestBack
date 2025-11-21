import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';
import { Permiso } from 'src/auth/decorators/permisos.decorator';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('permisos')
export class PermisosController {

    constructor(private permisosService : PermisosService){}

    @Post()
    @Permiso(5)
    @UseGuards(PermisosGuard)
    async createPermiso (@Body() body : CreatePermisoDto) {
        return await this.permisosService.createPermiso(body);
    }

    @Get('module/:id')
    @Permiso(6)
    @UseGuards(PermisosGuard)
    async getPermisos ( @Param('id',ParseIntPipe) id: number, @Query("page",ParseIntPipe) pageQuery : number, @Query("search") search?: string) {
        const page = pageQuery || 1;
        return await this.permisosService.getPermisos (id, page, search );
    }

    @Patch('update/:id')
    @Permiso(7)
    @UseGuards(PermisosGuard)
    async updatePermiso (@Param('id',ParseIntPipe) id: number, @Body() data: UpdatePermisoDto) {
        return await this.permisosService.updatePermiso(id,data);
    }

    @Patch('status/:id')
    @Permiso(8)
    @UseGuards(PermisosGuard)
    async updateStatus (@Param('id',ParseIntPipe) id: number) {
        return await this.permisosService.updateStatus(id);
    }

}
