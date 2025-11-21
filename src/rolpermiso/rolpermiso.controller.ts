import { Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permiso } from 'src/auth/decorators/permisos.decorator';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';
import { RolpermisoService } from './rolpermiso.service';

@UseGuards(AuthGuard('jwt'))
@Controller('rolpermiso')
export class RolpermisoController {
    constructor(private rolpermisoService : RolpermisoService){}

    @Post('/asign/:permisoId/:rolId/:valor')
    @Permiso(9)
    @UseGuards(PermisosGuard)
    async asignPermiso (@Param('permisoId',ParseIntPipe) permisoId : number, @Param('rolId',ParseIntPipe) rolId : number , @Param('valor',ParseBoolPipe) valor : boolean ) {
        return await this.rolpermisoService.asignPermiso(permisoId,rolId,valor);
    }

    @Get('/role/:rolId')
    @Permiso(9)
    @UseGuards(PermisosGuard)
    async getRolePermisos (@Param('rolId',ParseIntPipe) rolId : number ) {
        return await this.rolpermisoService.getRolePermisos(rolId);
    }

}
