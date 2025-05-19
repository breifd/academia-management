import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Page } from '../interfaces/page';
import { TareaEntity } from '../interfaces/tarea-entity';

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private apiUrl = 'http://localhost:8080/api/tareas';
  constructor( private http :  HttpClient) { }

  getTareas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(this.apiUrl, { params });
  }

  // Obtener una tarea por ID
  getTareaById(id: number): Observable<TareaEntity> {
    return this.http.get<TareaEntity>(`${this.apiUrl}/${id}`);
  }

  // Obtener todas las tareas (lista completa sin paginación)
  getTareasLista(): Observable<TareaEntity[]> {
    return this.http.get<TareaEntity[]>(`${this.apiUrl}/listar`);
  }

  // Buscar tareas por nombre
  searchTareas(nombre: string = '', page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/buscar`, { params });
  }

  // Obtener tareas pendientes (fecha límite posterior a hoy)
  getTareasPendientes(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/pendientes`, { params });
  }

  // Obtener tareas vencidas (fecha límite anterior a hoy)
  getTareasVencidas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<TareaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<TareaEntity>>(`${this.apiUrl}/vencidas`, { params });
  }

  // Crear una nueva tarea
  createTarea(tarea: TareaEntity): Observable<TareaEntity> {
    return this.http.post<TareaEntity>(this.apiUrl, tarea);
  }

  // Actualizar una tarea existente
  updateTarea(id: number, tarea: TareaEntity): Observable<TareaEntity> {
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

  tieneDocumento(tarea: TareaEntity): boolean {
    return tarea.nombreDocumento !== undefined && tarea.nombreDocumento !== null && tarea.nombreDocumento !== '';
  }

  // Formatear nota para mostrar
  formatNota(tarea: TareaEntity): string {
    const tieneDocumento = this.tieneDocumento(tarea);

    // Si no hay documento cargado y la fecha límite ya pasó
    if (!tieneDocumento && tarea.fechaLimite && new Date(tarea.fechaLimite) < new Date()) {
      return 'No presentado';
    }

    // Si hay nota, mostrarla formateada a 1 decimal
    if (tarea.nota !== null && tarea.nota !== undefined) {
      return tarea.nota.toFixed(1);
    }

    return 'Pendiente';
  }
}

