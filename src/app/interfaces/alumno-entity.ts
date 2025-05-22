import { CursoEntity } from "./curso-entity";
import { EntregaEntity } from "./Entregas";
import { TareaEntity } from "./tarea-entity";

export interface AlumnoEntity {
  id?: number;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string; // Se usa string para representar LocalDate en el frontend
  telefono?: string;
  email?: string;
  direccion?: string;

  cursos?: CursoEntity[];
  numeroCursos?: number;

  tareasAsignadas?: TareaEntity[]; // Tareas específicamente asignadas a este alumno
  entregas?: EntregaEntity[]; // Entregas realizadas por el alumno

  // Propiedades calculadas útiles para la UI
  totalTareas?: number;
  tareasEntregadas?: number;
  tareasCalificadas?: number;
  promedioNotas?: number;
}
