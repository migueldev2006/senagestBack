
export type JwtPayload = {
    sub : number;
    identificacion : string;
    correo : string;
    img : string;
    rolId : number | undefined;
    rol: string;
    nombre : string;
}