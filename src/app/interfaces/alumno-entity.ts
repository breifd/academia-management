import { CursoEntity } from "./curso-entity";
import { EntregaEntity } from "./entregas-entity";
import { TareaEntity } from "./tarea-entity";
import { UsuarioEntity } from "./usuario";


export interface AlumnoEntity {
  id?: number;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string; // Se usa string para representar LocalDate en el frontend
  telefono?: string;
  email?: string;
  direccion?: string;

  // Referencias a otras entidades
  usuario?: UsuarioEntity;
  cursos?: CursoEntity[];
  tareasAsignadas?: TareaEntity[];
  entregas?: EntregaEntity[];

  // Propiedades calculadas útiles para la UI
  numeroCursos?: number;
  totalTareas?: number;
  tareasEntregadas?: number;
  tareasCalificadas?: number;
  tareasPendientes?: number;
  tareasVencidas?: number;
  promedioNotas?: number;
}

// Para recibir datos del backend (mapea a AlumnoResponseDTO.java)
export interface AlumnoResponseDTO {
  id: number;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  username?: string;
  tieneUsuario?: boolean;
}

// Para enviar datos al backend (mapea a AlumnoCreateDTO.java)
export interface AlumnoCreateDTO {
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  usuario?: {
    username: string;
    password: string;
    nombre?: string;
    apellido?: string;
  };
}

// Versión simplificada para listados (mapea a AlumnoSimpleDTO.java)
export interface AlumnoSimpleDTO {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string;
}
