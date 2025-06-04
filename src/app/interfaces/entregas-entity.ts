import { AlumnoSimpleDTO } from "./alumno-entity";
import { TareaResponseDTO, TareaSimpleDTO } from "./tarea-entity";


export enum EstadoEntrega {
  PENDIENTE = 'PENDIENTE',
  ENTREGADA = 'ENTREGADA',
  CALIFICADA = 'CALIFICADA',
  FUERA_PLAZO = 'FUERA_PLAZO'
}

// Entidad base
export interface EntregaEntity {
  id?: number;
  tareaId?: number;
  alumnoId?: number;
  estado: EstadoEntrega;
  fechaEntrega?: string; // LocalDateTime como string
  nombreDocumento?: string;
  tipoDocumento?: string;
  nota?: number;
  comentarios?: string;
}

// Para recibir datos del backend (mapea a EntregaResponseDTO.java)
export interface EntregaResponseDTO {
  id: number;
  tarea?: TareaResponseDTO;
  alumno?: AlumnoSimpleDTO;
  estado: EstadoEntrega;
  fechaEntrega?: string;
  nombreDocumento?: string;
  tipoDocumento?: string;
  tieneDocumento: boolean;
  nota?: number;
  comentarios?: string;

  // Metadatos útiles para el frontend
  entregadaATiempo: boolean;
  calificada: boolean;

  nombreDocumentoProfesor?: string;
  tipoDocumentoProfesor?: string;
  tieneDocumentoProfesor: boolean;
}

// Para crear entregas (mapea a EntregaCreateDTO.java)
export interface EntregaCreateDTO {
  tareaId: number;
  alumnoId?: number; // Opcional porque se puede obtener del usuario autenticado
  comentarios?: string;
}

// Para solicitudes de calificación (mapea a CalificacionDTO.java)
export interface CalificacionDTO {
  nota: number;
  comentarios?: string;
}

// Versión simplificada para listados (mapea a EntregaSimpleDTO.java)
export interface EntregaSimpleDTO {
  id: number;
  tareaId: number;
  alumnoId: number;
  nombreAlumno: string;
  apellidoAlumno: string;
  fechaEntrega?: string;
  estado: EstadoEntrega;
  nota?: number;
}

// Para solicitar una entrega específica
export interface EntregaRequestDTO {
  tareaId: number;
  alumnoId?: number;
  comentarios?: string;
}
