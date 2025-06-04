import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Page } from '../interfaces/page';
import { TareaDTO, TareaResponseDTO, TareaSimpleDTO } from '../interfaces/tarea-entity';


@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private apiUrl = 'http://localhost:8080/api/tareas';

  constructor(private http: HttpClient) { }

  // Métodos básicos CRUD
  getTareas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(this.apiUrl, { params });
  }

  getTareaById(id: number): Observable<TareaResponseDTO> {
    return this.http.get<TareaResponseDTO>(`${this.apiUrl}/${id}`);
  }

  getTareasLista(): Observable<TareaSimpleDTO[]> {
    return this.http.get<TareaSimpleDTO[]>(`${this.apiUrl}/listar`);
  }

  searchTareas(nombre: string = '', page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(`${this.apiUrl}/buscar`, { params });
  }

  getTareasPendientes(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(`${this.apiUrl}/pendientes`, { params });
  }

  getTareasVencidas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(`${this.apiUrl}/vencidas`, { params });
  }

  // Crear tarea con DTO
  createTarea(tarea: TareaDTO): Observable<TareaResponseDTO> {
    return this.http.post<TareaResponseDTO>(this.apiUrl, tarea);
  }

  // Actualizar tarea con DTO
  updateTarea(id: number, tarea: TareaDTO): Observable<TareaResponseDTO> {
    return this.http.put<TareaResponseDTO>(`${this.apiUrl}/${id}`, tarea);
  }

  // Subir documento a una tarea
  uploadDocumento(id: number, file: File): Observable<TareaResponseDTO> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<TareaResponseDTO>(`${this.apiUrl}/${id}/documento`, formData);
  }

  // NUEVO: Crear tarea con documento en una operación
  createTareaConDocumento(formData: FormData): Observable<TareaResponseDTO> {
    return this.http.post<TareaResponseDTO>(`${this.apiUrl}/crear-con-documento`, formData);
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
  getTareasByProfesor(profesorId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(`${this.apiUrl}/profesor/${profesorId}`, { params });
  }

  // Obtener tareas de un curso
  getTareasByCurso(cursoId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(`${this.apiUrl}/curso/${cursoId}`, { params });
  }

  // Obtener tareas asignadas a un alumno
  getTareasByAlumno(alumnoId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaResponseDTO>>(`${this.apiUrl}/alumno/${alumnoId}`, { params });
  }

  // Obtener tareas de un curso para un alumno específico
  getTareasByCursoForAlumno(cursoId: number, alumnoId: number): Observable<TareaResponseDTO[]> {
    return this.http.get<TareaResponseDTO[]>(`${this.apiUrl}/curso/${cursoId}/alumno/${alumnoId}`);
  }

  // Métodos de utilidad
  tieneDocumento(tarea: TareaResponseDTO): boolean {
     return tarea.tieneDocumento === true ||
         (tarea.nombreDocumento !== undefined &&
          tarea.nombreDocumento !== null &&
          tarea.nombreDocumento !== '');
  }

  formatNota(tarea: TareaResponseDTO): string {
    const tieneDocumento = this.tieneDocumento(tarea);

    // Si no hay documento cargado y la fecha límite ya pasó
    if (!tieneDocumento && tarea.fechaLimite && new Date(tarea.fechaLimite) < new Date()) {
      return 'No presentado';
    }

    return 'Pendiente';
  }

  // Verificar si una tarea está vencida
  isTareaVencida(tarea: TareaResponseDTO): boolean {
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
  getEstadoTarea(tarea: TareaResponseDTO): string {
    if (this.isTareaVencida(tarea)) {
      return 'Vencida';
    }

    if (tarea.fechaPublicacion && new Date(tarea.fechaPublicacion) > new Date()) {
      return 'Programada';
    }

    return 'Activa';
  }
}
