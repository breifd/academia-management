import { CursoEntity } from "./curso-entity";

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
}
