// Importar las interfaces necesarias
import { TareaEntity } from './tarea-entity';

export interface EstadisticasGenerales {
  totalProfesores: number;
  totalAlumnos: number;
  totalCursos: number;
  totalTareas: number;
  totalEntregas: number;
  totalEspecialidades: number;
  loading?: boolean;
  error?: string;
}

export interface EstadisticasProfesor {
  profesorId: number;
  nombreCompleto: string;
  totalTareas: number;
  tareasActivas: number;
  entregasPendientes: number;
  totalAlumnos: number;
  promedioCalificaciones: number;
  cursosImpartidos: number;
}

export interface EstadisticasAlumno {
  alumnoId: number;
  nombreCompleto: string;
  totalTareas: number;
  tareasEntregadas: number;
  tareasCalificadas: number;
  tareasPendientes: number;
  tareasVencidas: number;
  promedioNotas: number;
  cursosMatriculados: number;
}

export interface EstadisticasCurso {
  cursoId: number;
  nombreCurso: string;
  totalTareas: number;
  tareasActivas: number;
  totalAlumnos: number;
  totalProfesores: number;
  promedioEntregas: number;
  promedioCalificaciones: number;
}

export interface EstadisticasTarea {
  tareaId: number;
  nombreTarea: string;
  nombreCurso: string;
  nombreProfesor: string;
  fechaLimite?: string;
  totalAlumnosAsignados: number;
  totalEntregas: number;
  entregasCalificadas: number;
  entregasPendientes: number;
  entregasFueraPlazo: number;
  promedioCalificacion: number;
  porcentajeEntrega: number;
}

export interface ResumenEntregas {
  pendientes: number;
  entregadas: number;
  calificadas: number;
  fueraPlazo: number;
  total: number;
}

export interface DashboardData {
  estadisticasGenerales: EstadisticasGenerales;
  resumenEntregas: ResumenEntregas;
  ultimasTareas: TareaEntity[];
  proximosVencimientos: TareaEntity[];
  // Datos específicos según el rol del usuario
  datosProfesor?: EstadisticasProfesor;
  datosAlumno?: EstadisticasAlumno;
}

