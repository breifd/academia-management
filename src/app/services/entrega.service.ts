import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../interfaces/page';
import { CalificacionDTO, EntregaEntity, EntregaRequestDTO, EstadoEntrega } from '../interfaces/Entregas';


@Injectable({
  providedIn: 'root'
})
export class EntregaService {
  private apiUrl = 'http://localhost:8080/api/entregas';

  constructor(private http: HttpClient) { }

  // Métodos básicos CRUD
  getEntregas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaEntity>>(this.apiUrl, { params });
  }

  getEntregaById(id: number): Observable<EntregaEntity> {
    return this.http.get<EntregaEntity>(`${this.apiUrl}/${id}`);
  }

  // Crear una nueva entrega
  createEntrega(entregaDTO: EntregaRequestDTO): Observable<EntregaEntity> {
    return this.http.post<EntregaEntity>(this.apiUrl, entregaDTO);
  }

  // Subir documento a una entrega
  uploadDocumento(id: number, file: File): Observable<EntregaEntity> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<EntregaEntity>(`${this.apiUrl}/${id}/documento`, formData);
  }

  // Descargar documento de una entrega
  downloadDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/documento`, {
      responseType: 'blob'
    });
  }

  // Calificar una entrega (solo profesores)
  calificarEntrega(id: number, calificacion: CalificacionDTO): Observable<EntregaEntity> {
    return this.http.post<EntregaEntity>(`${this.apiUrl}/${id}/calificar`, calificacion);
  }

  // Eliminar una entrega (solo admin)
  deleteEntrega(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Métodos específicos para profesores

  // Obtener entregas pendientes de calificación
  getEntregasPendientesCalificacion(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaEntity>>(`${this.apiUrl}/pendientes`, { params });
  }

  // Contar entregas pendientes de calificación
  countEntregasPendientesCalificacion(): Observable<{pendientes: number}> {
    return this.http.get<{pendientes: number}>(`${this.apiUrl}/pendientes/count`);
  }

  // Métodos específicos para alumnos

  // Obtener entregas de un alumno (el alumno autenticado)
  getEntregasByAlumno(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaEntity>>(`${this.apiUrl}/alumno`, { params });
  }

  // Métodos de utilidad

  // Verificar si una entrega tiene documento
  tieneDocumento(entrega: EntregaEntity): boolean {
    return entrega.nombreDocumento !== undefined &&
           entrega.nombreDocumento !== null &&
           entrega.nombreDocumento !== '';
  }

  // Formatear fecha de entrega
  formatFechaEntrega(fechaEntrega?: string): string {
    if (!fechaEntrega) return 'N/A';

    try {
      const fecha = new Date(fechaEntrega);
      return fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString();
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha inválida';
    }
  }

  // Obtener el color del estado para mostrar en la UI
  getEstadoColor(estado: EstadoEntrega): string {
    switch (estado) {
      case EstadoEntrega.PENDIENTE:
        return '#ff9800'; // Naranja
      case EstadoEntrega.ENTREGADA:
        return '#2196f3'; // Azul
      case EstadoEntrega.CALIFICADA:
        return '#4caf50'; // Verde
      case EstadoEntrega.FUERA_PLAZO:
        return '#f44336'; // Rojo
      default:
        return '#666'; // Gris
    }
  }

  // Obtener el texto del estado
  getEstadoTexto(estado: EstadoEntrega): string {
    switch (estado) {
      case EstadoEntrega.PENDIENTE:
        return 'Pendiente';
      case EstadoEntrega.ENTREGADA:
        return 'Entregada';
      case EstadoEntrega.CALIFICADA:
        return 'Calificada';
      case EstadoEntrega.FUERA_PLAZO:
        return 'Fuera de plazo';
      default:
        return 'Desconocido';
    }
  }

  // Verificar si se puede subir documento a una entrega
  puedeSubirDocumento(entrega: EntregaEntity): boolean {
    return entrega.estado === EstadoEntrega.PENDIENTE ||
           entrega.estado === EstadoEntrega.ENTREGADA;
  }

  // Verificar si una entrega está calificada
  estaCalificada(entrega: EntregaEntity): boolean {
    return entrega.estado === EstadoEntrega.CALIFICADA &&
           entrega.nota !== undefined &&
           entrega.nota !== null;
  }

  // Formatear nota
  formatNota(entrega: EntregaEntity): string {
    if (entrega.nota === undefined || entrega.nota === null) {
      return 'Sin calificar';
    }
    return entrega.nota.toFixed(1) + '/10';
  }

  // Verificar si una entrega está fuera de plazo
  estaFueraDePlazo(entrega: EntregaEntity): boolean {
    return entrega.estado === EstadoEntrega.FUERA_PLAZO;
  }
}
