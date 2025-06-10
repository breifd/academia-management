import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Page } from '../interfaces/page';

import { ProfesoresComponent } from '../academia/profesores/lista-profesores/lista-profesores.component';
import { CursoConDetallesDTO, CursoCreateDTO, CursoEntity, CursoResponseDTO, CursoSimpleDTO } from '../interfaces/curso-entity';
import { ProfesorSimpleDTO } from '../interfaces/profesor-entity';
import { AlumnoSimpleDTO } from '../interfaces/alumno-entity';
import { API_CONFIG, ENDPOINTS } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private apiUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.CURSOS}`;
  private defaultMaxAlumnos : number =30;
  constructor(private http: HttpClient) { }

  // Obtener todos los cursos paginados
  getCursos(page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoResponseDTO>>(this.apiUrl, { params });
  }

  // Obtener un curso por ID
  getCursoById(id: number): Observable<CursoResponseDTO> {
    return this.http.get<CursoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  // Obtener todos los cursos (lista completa sin paginación)
  getCursosLista(): Observable<CursoSimpleDTO[]> {
    return this.http.get<CursoSimpleDTO[]>(`${this.apiUrl}/listar`);
  }

  // Buscar cursos por nombre
  searchCursos(nombre: string = '', page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoResponseDTO>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoResponseDTO>>(`${this.apiUrl}/buscar`, { params });
  }

  // Filtrar cursos por nivel
  getByNivel(nivel: string, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoResponseDTO>>(`${this.apiUrl}/nivel/${nivel}`, { params });
  }

  // Crear un nuevo curso
  createCurso(curso: CursoCreateDTO): Observable<CursoResponseDTO> {
    return this.http.post<CursoResponseDTO>(this.apiUrl, curso);
  }

  // Actualizar un curso existente
  updateCurso(id: number, curso: CursoCreateDTO): Observable<CursoResponseDTO> {
    return this.http.put<CursoResponseDTO>(`${this.apiUrl}/${id}`, curso);
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
  isProfesorAssignedToCurso(curso: CursoResponseDTO, profesorId: number): boolean {
    return curso.profesores ? curso.profesores.some(p => p.id === profesorId) : false;
  }

  // Verificar si un alumno está inscrito en un curso
  isAlumnoEnrolledInCurso(curso: CursoResponseDTO, alumnoId: number): boolean {

    // verificamos si la propiedad alumnos existe y si es un array y luego verificamos si el id del alumno existe en el array
    //mediante el método some, si la propiedad alumnos no existe o no es un array devolvemos false
    return curso.alumnos ? curso.alumnos.some(a => a.id === alumnoId) : false;
  }

  // Obtener número de profesores de un curso
  getNumeroProfesores(curso: CursoResponseDTO): number {
    return curso.profesores ? curso.profesores.length : 0;
  }

  // Obtener número de alumnos de un curso
  getNumeroAlumnos(curso: CursoResponseDTO): number {
    return curso.alumnos ? curso.alumnos.length : 0;
  }

  // Calcular plazas disponibles (si hay un límite)
  getPlazasDisponibles(curso: CursoResponseDTO, maxAlumnos: number = this.defaultMaxAlumnos): number {
    const numAlumnos = this.getNumeroAlumnos(curso);
    return Math.max(0, maxAlumnos - numAlumnos);
  }
  hasPlazasDisponibles(curso : CursoResponseDTO, maxAlumnos : number =this.defaultMaxAlumnos): boolean{
    return this.getPlazasDisponibles(curso, maxAlumnos)>0;
  }
  formatProfesoresList(profesores : ProfesorSimpleDTO[]): string{
    if(!profesores || profesores.length  === 0){
      return "Sin profesores"
    }
    else if(profesores.length <=2){
      // Muestra los nombres y apellidos de los profesores que están impartiendo el curso
      return profesores.map(p=> `${p.nombre} ${p.apellido}`).join(', ');
    }
    return `${profesores[0].nombre} ${profesores[0].apellido} y ${profesores.length-1} más`
  }
  getMaxAlumnos(): number{
    return this.defaultMaxAlumnos;
  }
  assignProfesorToCurso(cursoId: number, profesorId: number): Observable<CursoResponseDTO> {
    return this.http.post<CursoResponseDTO>(`${this.apiUrl}/${cursoId}/profesores/${profesorId}`, {});
  }

  removeProfesorFromCurso(cursoId: number, profesorId: number): Observable<CursoResponseDTO> {
    return this.http.delete<CursoResponseDTO>(`${this.apiUrl}/${cursoId}/profesores/${profesorId}`);
  }

  getProfesoresByCurso(cursoId: number): Observable<ProfesorSimpleDTO[]> {
    return this.http.get<ProfesorSimpleDTO[]>(`${this.apiUrl}/${cursoId}/profesores`);
  }

  getCursosByProfesor(profesorId: number, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoResponseDTO>>(`${this.apiUrl}/profesor/${profesorId}`, { params });
  }

  // === GESTIÓN DE ALUMNOS ===

  enrollAlumnoInCurso(cursoId: number, alumnoId: number): Observable<CursoResponseDTO> {
    return this.http.post<CursoResponseDTO>(`${this.apiUrl}/${cursoId}/alumnos/${alumnoId}`, {});
  }

  unenrollAlumnoFromCurso(cursoId: number, alumnoId: number): Observable<CursoResponseDTO> {
    return this.http.delete<CursoResponseDTO>(`${this.apiUrl}/${cursoId}/alumnos/${alumnoId}`);
  }

  getAlumnosByCurso(cursoId: number): Observable<AlumnoSimpleDTO[]> {
    return this.http.get<AlumnoSimpleDTO[]>(`${this.apiUrl}/${cursoId}/alumnos`);
  }

  getCursosByAlumno(alumnoId: number, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoResponseDTO>>(`${this.apiUrl}/alumno/${alumnoId}`, { params });
  }

  // === MÉTODOS DE BÚSQUEDA AVANZADA ===

  getCursosConPlazasDisponibles(plazasMinimas: number = 5, page: number = 0, size: number = 5, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoResponseDTO>> {
    let params = new HttpParams()
      .set('plazasMinimas', plazasMinimas.toString())
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoResponseDTO>>(`${this.apiUrl}/con-plazas-disponibles`, { params });
  }

  getCursoWithDetails(id: number): Observable<CursoConDetallesDTO> {
    return this.http.get<CursoConDetallesDTO>(`${this.apiUrl}/${id}/detalles`);
  }
}
