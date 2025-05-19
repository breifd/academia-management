import { RolUsuario } from "../enum/rol-usuario";


export interface UsuarioDTO {
  id?: number;
  username: string;
  password?: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  profesorId?: number;
  alumnoId?: number;
}
