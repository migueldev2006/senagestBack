import { Controller, Get, UseGuards } from '@nestjs/common';
import { FichasService } from './fichas.service';
import { Permiso } from 'src/auth/decorators/permisos.decorator';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('fichas')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermisosGuard)
export class FichasController {
    constructor(private fichasService: FichasService) { }

    @Get('all')
    @Permiso(14,16)
    async getAllFichas() {
        return await this.fichasService.getAllFichas();
    }
}
