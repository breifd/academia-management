import { CursoEntity } from "./curso-entity";
import { TareaEntity } from "./tarea-entity";

export interface ProfesorEntity {
  id?: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
  anhosExperiencia?: number;
  cursos?: CursoEntity[];
  numeroCursos?: number;

  tareas?: TareaEntity[]; // Tareas creadas por el profesor

  // Propiedades calculadas útiles para la UI
  totalTareas?: number;
  tareasActivas?: number;
  entregasPendientesCalificacion?: number;
  totalAlumnosEnCursos?: number;
}
