import { AlumnoSimpleDTO } from "./alumno-entity";
import { ProfesorSimpleDTO } from "./profesor-entity";


export enum RolUsuario {
  ADMIN = 'Admin',
  PROFESOR = 'Profesor',
  ALUMNO = 'Alumno'
}

// Entidad básica de usuario
export interface UsuarioEntity {
  id?: number;
  username: string;
  password?: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  profesorId?: number;
  alumnoId?: number;
}

// Para recibir datos del backend (mapea a UsuarioResponseDTO.java)
export interface UsuarioResponseDTO {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;

  // Info básica sin recursión
  profesor?: ProfesorSimpleDTO;
  alumno?: AlumnoSimpleDTO;
}

// Para crear usuarios (mapea a UsuarioCreateDTO.java)
export interface UsuarioCreateDTO {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  profesorId?: number;
  alumnoId?: number;
}

// Para actualizar usuarios (mapea a UsuarioDTO.java)
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

// Para respuestas de login (mapea a LoginResponse.java)
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

// Para solicitudes de login
export interface LoginRequest {
  username: string;
  password: string;
}
