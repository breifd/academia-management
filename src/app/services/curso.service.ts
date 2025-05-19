import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CursoEntity } from '../interfaces/curso-entity';
import { Page } from '../interfaces/page';
import { ProfesorEntity } from '../interfaces/profesor-entity';
import { AlumnoEntity } from '../interfaces/alumno-entity';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private apiUrl = 'http://localhost:8080/api/cursos';

  constructor(private http: HttpClient) { }

  // Obtener todos los cursos paginados
  getCursos(page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(this.apiUrl, { params });
  }

  // Obtener un curso por ID
  getCursoById(id: number): Observable<CursoEntity> {
    return this.http.get<CursoEntity>(`${this.apiUrl}/${id}`);
  }

  // Obtener todos los cursos (lista completa sin paginación)
  getCursosLista(): Observable<CursoEntity[]> {
    return this.http.get<CursoEntity[]>(`${this.apiUrl}/listar`);
  }

  // Buscar cursos por nombre
  searchCursos(nombre: string = '', page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(`${this.apiUrl}/buscar`, { params });
  }

  // Filtrar cursos por nivel
  getByNivel(nivel: string, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(`${this.apiUrl}/nivel/${nivel}`, { params });
  }

  // Crear un nuevo curso
  createCurso(curso: CursoEntity): Observable<CursoEntity> {
    return this.http.post<CursoEntity>(this.apiUrl, curso);
  }

  // Actualizar un curso existente
  updateCurso(id: number, curso: CursoEntity): Observable<CursoEntity> {
    return this.http.put<CursoEntity>(`${this.apiUrl}/${id}`, curso);
  }

  // Eliminar un curso
  deleteCurso(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Obtener los niveles disponibles (basado en el enum)
  getNiveles(): string[] {
    return ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
  }

  //Metodos de utilidad

// Verificar si un profesor está asignado a un curso
  isProfesorAssignedToCurso(curso: CursoEntity, profesorId: number): boolean {
    return curso.profesores ? curso.profesores.some(p => p.id === profesorId) : false;
  }

  // Verificar si un alumno está inscrito en un curso
  isAlumnoEnrolledInCurso(curso: CursoEntity, alumnoId: number): boolean {

    // verificamos si la propiedad alumnos existe y si es un array y luego verificamos si el id del alumno existe en el array
    //mediante el método some, si la propiedad alumnos no existe o no es un array devolvemos false
    return curso.alumnos ? curso.alumnos.some(a => a.id === alumnoId) : false;
  }

  // Obtener número de profesores de un curso
  getNumeroProfesores(curso: CursoEntity): number {
    return curso.profesores ? curso.profesores.length : 0;
  }

  // Obtener número de alumnos de un curso
  getNumeroAlumnos(curso: CursoEntity): number {
    return curso.alumnos ? curso.alumnos.length : 0;
  }

  // Calcular plazas disponibles (si hay un límite)
  getPlazasDisponibles(curso: CursoEntity, maxAlumnos: number = 30): number {
    const numAlumnos = this.getNumeroAlumnos(curso);
    return Math.max(0, maxAlumnos - numAlumnos);
  }
  assignProfesorToCurso(cursoId: number, profesorId: number): Observable<CursoEntity> {
    return this.http.post<CursoEntity>(`${this.apiUrl}/${cursoId}/profesores/${profesorId}`, {});
  }

  removeProfesorFromCurso(cursoId: number, profesorId: number): Observable<CursoEntity> {
    return this.http.delete<CursoEntity>(`${this.apiUrl}/${cursoId}/profesores/${profesorId}`);
  }

  getProfesoresByCurso(cursoId: number): Observable<ProfesorEntity[]> {
    return this.http.get<ProfesorEntity[]>(`${this.apiUrl}/${cursoId}/profesores`);
  }

  getCursosByProfesor(profesorId: number, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(`${this.apiUrl}/profesor/${profesorId}`, { params });
  }

  // === GESTIÓN DE ALUMNOS ===

  enrollAlumnoInCurso(cursoId: number, alumnoId: number): Observable<CursoEntity> {
    return this.http.post<CursoEntity>(`${this.apiUrl}/${cursoId}/alumnos/${alumnoId}`, {});
  }

  unenrollAlumnoFromCurso(cursoId: number, alumnoId: number): Observable<CursoEntity> {
    return this.http.delete<CursoEntity>(`${this.apiUrl}/${cursoId}/alumnos/${alumnoId}`);
  }

  getAlumnosByCurso(cursoId: number): Observable<AlumnoEntity[]> {
    return this.http.get<AlumnoEntity[]>(`${this.apiUrl}/${cursoId}/alumnos`);
  }

  getCursosByAlumno(alumnoId: number, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(`${this.apiUrl}/alumno/${alumnoId}`, { params });
  }

  // === MÉTODOS DE BÚSQUEDA AVANZADA ===

  getCursosSinProfesores(page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(`${this.apiUrl}/sin-profesores`, { params });
  }

  getCursosConPlazasDisponibles(maxAlumnos: number = 30, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoEntity>> {
    let params = new HttpParams()
      .set('maxAlumnos', maxAlumnos.toString())
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoEntity>>(`${this.apiUrl}/con-plazas-disponibles`, { params });
  }

  getCursoWithDetails(id: number): Observable<CursoEntity> {
    return this.http.get<CursoEntity>(`${this.apiUrl}/${id}/detalles`);
  }
}
