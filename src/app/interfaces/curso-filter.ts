export interface CursoFilter {
  nombre?: string;
  nivel?: string;
  profesorId?: number;
  alumnoId?: number;
  sinProfesores?: boolean;
  conPlazasDisponibles?: boolean;
  maxAlumnos?: number;
}
