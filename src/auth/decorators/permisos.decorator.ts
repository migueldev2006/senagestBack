import { SetMetadata } from "@nestjs/common";

export const PERMISO_KEY = 'permisos';
export const Permiso = (...permisos : number[]) => SetMetadata(PERMISO_KEY, permisos);