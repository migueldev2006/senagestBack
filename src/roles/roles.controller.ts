import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';
import { Permiso } from 'src/auth/decorators/permisos.decorator';
import { UpdateRolDto } from './dto/update-rol.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('roles')
export class RolesController {

    constructor(private rolesService : RolesService) {}

    @Post()
    @Permiso(10)
    @UseGuards(PermisosGuard)
    async createRol(@Body() data : CreateRolDto) {
        return await this.rolesService.createRol(data);
    }

    @Get()
    @Permiso(11)
    @UseGuards(PermisosGuard)
    async getRoles(@Query("page",ParseIntPipe) pageQuery : number | undefined, @Query("search") search?: string) {
        const page = pageQuery ?? 1;
        return await this.rolesService.getRoles(page,search);
    }

    @Get('/all')
    @Permiso(11,9,14)
    @UseGuards(PermisosGuard)
    async getAllRoles () {
        return await this.rolesService.getAllRoles();
    }

    @Patch('update/:id')
    @Permiso(12)
    @UseGuards(PermisosGuard)
    async updateRol(@Param('id',ParseIntPipe) id: number, @Body() data: UpdateRolDto) {
        return await this.rolesService.updateRol(id, data);
    }

    @Patch('status/:id')
    @Permiso(13)
    @UseGuards(PermisosGuard)
    async updateStatus(@Param('id',ParseIntPipe) id: number) {
        return await this.rolesService.updateStatus(id);
    }

}
