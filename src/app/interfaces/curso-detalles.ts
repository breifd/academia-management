import { AlumnoEntity } from "./alumno-entity";
import { CursoEntity } from "./curso-entity";
import { ProfesorEntity } from "./profesor-entity";

export interface CursoDetalles {
  curso: CursoEntity;
  profesores: ProfesorEntity[];
  alumnos: AlumnoEntity[];
  estadisticas: {
    totalProfesores: number;
    totalAlumnos: number;
    plazasDisponibles?: number;
    maxAlumnos?: number;
  };
}
