import { AlumnoEntity } from "./alumno-entity";
import { ProfesorEntity } from "./profesor-entity";

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
}
