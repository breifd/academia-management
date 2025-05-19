import { RolUsuario } from "../enum/rol-usuario";

export interface LoginResponse {
  success: boolean;
  message: string;
  username?: string;
  nombre?: string;
  apellido?: string;
  rol?: RolUsuario;
  profesorId?: number;
  alumnoId?: number;
  errorCode?: string;
}
