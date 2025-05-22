import { AlumnoEntity } from "./alumno-entity";
import { ProfesorEntity } from "./profesor-entity";
import { TareaEntity } from "./tarea-entity";

export interface CursoEntity {
  id?: number;
  nombre: string;
  descripcion?: string;
  nivel?: 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto';
  precio?: number;
  profesores?: ProfesorEntity[];
  alumnos?: AlumnoEntity[];
  numeroProfesores?: number;
  numeroAlumnos?: number;

  tareas?: TareaEntity[]; // Tareas asignadas al curso

  // Propiedades calculadas útiles para la UI
  totalTareas?: number;
  tareasActivas?: number;
  tareasVencidas?: number;
  promedioEntregas?: number;
  maxAlumnos?: number; // Capacidad máxima del curso
  plazasDisponibles?: number;
}
