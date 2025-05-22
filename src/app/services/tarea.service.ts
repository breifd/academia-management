import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Page } from '../interfaces/page';
import { TareaEntity, TareaDTO } from '../interfaces/tarea-entity';

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private apiUrl = 'http://localhost:8080/api/tareas';

  constructor(private http: HttpClient) { }

  // Métodos básicos CRUD
  getTareas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(this.apiUrl, { params });
  }

  getTareaById(id: number): Observable<TareaEntity> {
    return this.http.get<TareaEntity>(`${this.apiUrl}/${id}`);
  }

  getTareasLista(): Observable<TareaEntity[]> {
    return this.http.get<TareaEntity[]>(`${this.apiUrl}/listar`);
  }

  searchTareas(nombre: string = '', page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/buscar`, { params });
  }

  getTareasPendientes(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/pendientes`, { params });
  }

  getTareasVencidas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/vencidas`, { params });
  }

  // Crear tarea con DTO
  createTarea(tarea: TareaDTO): Observable<TareaEntity> {
    return this.http.post<TareaEntity>(this.apiUrl, tarea);
  }

  // Actualizar tarea con DTO
  updateTarea(id: number, tarea: TareaDTO): Observable<TareaEntity> {
    return this.http.put<TareaEntity>(`${this.apiUrl}/${id}`, tarea);
  }

  // Subir documento a una tarea
  uploadDocumento(id: number, file: File): Observable<TareaEntity> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<TareaEntity>(`${this.apiUrl}/${id}/documento`, formData);
  }

  // Descargar documento de una tarea
  downloadDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/documento`, {
      responseType: 'blob'
    });
  }

  deleteTarea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Métodos específicos por rol

  // Obtener tareas de un profesor
  getTareasByProfesor(profesorId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/profesor/${profesorId}`, { params });
  }

  // Obtener tareas de un curso
  getTareasByCurso(cursoId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/curso/${cursoId}`, { params });
  }

  // Obtener tareas asignadas a un alumno
  getTareasByAlumno(alumnoId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/alumno/${alumnoId}`, { params });
  }

  // Obtener tareas de un curso para un alumno específico
  getTareasByCursoForAlumno(cursoId: number, alumnoId: number): Observable<TareaEntity[]> {
    return this.http.get<TareaEntity[]>(`${this.apiUrl}/curso/${cursoId}/alumno/${alumnoId}`);
  }

  // Métodos de utilidad
  tieneDocumento(tarea: TareaEntity): boolean {
    return tarea.nombreDocumento !== undefined && tarea.nombreDocumento !== null && tarea.nombreDocumento !== '';
  }

  formatNota(tarea: TareaEntity): string {
    const tieneDocumento = this.tieneDocumento(tarea);

    // Si no hay documento cargado y la fecha límite ya pasó
    if (!tieneDocumento && tarea.fechaLimite && new Date(tarea.fechaLimite) < new Date()) {
      return 'No presentado';
    }

    return 'Pendiente';
  }

  // Verificar si una tarea está vencida
  isTareaVencida(tarea: TareaEntity): boolean {
    if (!tarea.fechaLimite) {
      return false;
    }
    try {
      const fechaLimite = new Date(tarea.fechaLimite);
      const ahora = new Date();
      return fechaLimite < ahora;
    } catch (error) {
      console.error('Error al procesar la fecha:', error);
      return false;
    }
  }

  // Obtener el estado de una tarea para un alumno
  getEstadoTarea(tarea: TareaEntity): string {
    if (this.isTareaVencida(tarea)) {
      return 'Vencida';
    }

    if (tarea.fechaPublicacion && new Date(tarea.fechaPublicacion) > new Date()) {
      return 'Programada';
    }

    return 'Activa';
  }
}
