import { CursoEntity } from "./curso-entity";

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
}
