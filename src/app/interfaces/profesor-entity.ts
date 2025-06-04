
import { CursoEntity } from "./curso-entity";
import { TareaEntity } from "./tarea-entity";
import { UsuarioEntity } from "./usuario";






export interface ProfesorEntity {
  id?: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
  anhosExperiencia?: number;

  // Referencias a otras entidades
  usuario?: UsuarioEntity;
  cursos?: CursoEntity[];
  tareas?: TareaEntity[];
}

// Para recibir datos del backend (mapea a ProfesorResponseDTO.java)
export interface ProfesorResponseDTO {
  id: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
  anhosExperiencia?: number;

  // Info del usuario asociado
  username?: string;
  tieneUsuario: boolean;
}

// Para crear profesores (mapea a ProfesorCreateDTO.java)
export interface ProfesorCreateDTO {
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
  anhosExperiencia?: number;

  // Para crear usuario asociado (opcional)
  usuario?: {
    username: string;
    password: string;
    nombre?: string;
    apellido?: string;
  };
}

// Versión simplificada para listados (mapea a ProfesorSimpleDTO.java)
export interface ProfesorSimpleDTO {
  id: number;
  nombre?: string;
  apellido?: string;
  especialidad?: string;
}

// Estadísticas útiles para el frontend
export interface ProfesorEstadisticas {
  numeroCursos?: number;
  totalTareas?: number;
  tareasActivas?: number;
  entregasPendientesCalificacion?: number;
  totalAlumnosEnCursos?: number;
  promedioCalificaciones?: number;
}
