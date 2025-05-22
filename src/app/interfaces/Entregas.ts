import { AlumnoEntity } from "./alumno-entity";
import { TareaEntity } from "./tarea-entity";

export interface EntregaEntity {
  id?: number;
  tarea?: TareaEntity;
  alumno?: AlumnoEntity;
  estado: EstadoEntrega;
  fechaEntrega?: string; // LocalDateTime como string
  documento?: any;
  nombreDocumento?: string;
  tipoDocumento?: string;
  nota?: number;
  comentarios?: string;
}

export enum EstadoEntrega {
  PENDIENTE = 'PENDIENTE',
  ENTREGADA = 'ENTREGADA',
  CALIFICADA = 'CALIFICADA',
  FUERA_PLAZO = 'FUERA_PLAZO'
}

export interface EntregaRequestDTO {
  tareaId: number;
  alumnoId?: number; // Opcional porque se obtiene del usuario autenticado
  comentarios?: string;
}

export interface CalificacionDTO {
  nota: number;
  comentarios?: string;
}

export interface EntregaDTO {
  id?: number;
  tareaId?: number;
  alumnoId?: number;
  nombreAlumno?: string;
  apellidoAlumno?: string;
  fechaEntrega?: string;
  nombreDocumento?: string;
  nota?: number;
  comentarios?: string;
  estado: EstadoEntrega;
}
