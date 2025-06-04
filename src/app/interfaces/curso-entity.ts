import { AlumnoSimpleDTO } from "./alumno-entity";
import { ProfesorSimpleDTO } from "./profesor-entity";
import { TareaSimpleDTO } from "./tarea-entity";


export type NivelCurso = 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto';

export interface CursoEntity {
  id?: number;
  nombre: string;
  descripcion?: string;
  nivel?: NivelCurso;
  precio?: number;
}

// Respuesta del backend (mapea a CursoResponseDTO.java)
export interface CursoResponseDTO {
  id: number;
  nombre: string;
  descripcion?: string;
  nivel?: NivelCurso;
  precio?: number;

  // Referencias simplificadas para evitar recursión
  profesores?: ProfesorSimpleDTO[];
  alumnos?: AlumnoSimpleDTO[];

  // Estadísticas incluidas en la respuesta
  totalProfesores: number;
  totalAlumnos: number;
  totalTareas: number;
}

// Versión con detalles completos (mapea a CursoConDetallesDTO.java)
export interface CursoConDetallesDTO {
  id: number;
  nombre: string;
  descripcion?: string;
  nivel?: NivelCurso;
  precio?: number;

  profesores: ProfesorSimpleDTO[];
  alumnos: AlumnoSimpleDTO[];
  tareas: TareaSimpleDTO[];

  totalProfesores: number;
  totalAlumnos: number;
  totalTareas: number;
  plazasDisponibles: number;
}

// Para crear/actualizar cursos (mapea a CursoCreateDTO.java)
export interface CursoCreateDTO {
  nombre: string;
  descripcion?: string;
  nivel?: NivelCurso;
  precio?: number;
}

// Versión simplificada para listados (mapea a CursoSimpleDTO.java)
export interface CursoSimpleDTO {
  id: number;
  nombre: string;
  nivel?: NivelCurso;
}

// Para solicitudes de asignación
export interface AsignacionCursoDTO {
  cursoId: number;
  personaId: number; // Puede ser profesorId o alumnoId
  accion: 'ASIGNAR' | 'DESASIGNAR';
}
