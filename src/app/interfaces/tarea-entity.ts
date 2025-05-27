import { AlumnoSimpleDTO } from "./alumno-entity";
import { CursoSimpleDTO } from "./curso-entity";
import { ProfesorSimpleDTO } from "./profesor-entity";


export interface TareaEntity {
  id?: number;
  nombre: string;
  descripcion?: string;
  fechaPublicacion?: string;
  fechaLimite?: string;
  nombreDocumento?: string;
  tipoDocumento?: string;
  cursoId?: number;
  profesorId?: number;
  paraTodosLosAlumnos?: boolean;
}

// Para recibir datos del backend (mapea a TareaResponseDTO.java)
export interface TareaResponseDTO {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaPublicacion?: string;
  fechaLimite?: string;
  paraTodosLosAlumnos: boolean;
  nombreDocumento?: string;
  tieneDocumento: boolean;

  // Info básica sin recursión
  curso?: CursoSimpleDTO;
  profesor?: ProfesorSimpleDTO;
  alumnosAsignados?: AlumnoSimpleDTO[];

  // Estadísticas para el frontend
  totalEntregas: number;
  entregasPendientes: number;
}

// Para crear/actualizar tareas (mapea a TareaDTO.java)
export interface TareaDTO {
  id?: number;
  nombre: string;
  descripcion?: string;
  fechaPublicacion?: string;
  fechaLimite: string;
  cursoId: number;
  profesorId?: number;
  paraTodosLosAlumnos: boolean;
  alumnosIds?: number[];
}

// Versión simplificada para listados (mapea a TareaSimpleDTO.java)
export interface TareaSimpleDTO {
  id: number;
  nombre: string;
  fechaLimite?: string;
  paraTodosLosAlumnos: boolean;
}
