import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../interfaces/page';
import { EntregaResponseDTO, EntregaCreateDTO, EstadoEntrega, CalificacionDTO } from '../interfaces/entregas-entity';


@Injectable({
  providedIn: 'root'
})
export class EntregaService {
  private apiUrl = 'http://localhost:8080/api/entregas';

  constructor(private http: HttpClient) { }

  // Métodos básicos CRUD
  getEntregas(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaResponseDTO>>(this.apiUrl, { params });
  }

  updateEntrega(id: number, entregaDTO: EntregaCreateDTO): Observable<EntregaResponseDTO> {
    return this.http.put<EntregaResponseDTO>(`${this.apiUrl}/${id}`, entregaDTO);
  }

  getEntregaById(id: number): Observable<EntregaResponseDTO> {
    return this.http.get<EntregaResponseDTO>(`${this.apiUrl}/${id}`);
  }

  // Obtener todas las entregas de un profesor
  getEntregasByProfesor(profesorId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaResponseDTO>>(`${this.apiUrl}/profesor/${profesorId}`, { params });
  }

  // Crear una nueva entrega
  createEntrega(entregaDTO: EntregaCreateDTO): Observable<EntregaResponseDTO> {
    return this.http.post<EntregaResponseDTO>(this.apiUrl, entregaDTO);
  }

  // Subir documento a una entrega
  uploadDocumento(id: number, file: File): Observable<EntregaResponseDTO> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<EntregaResponseDTO>(`${this.apiUrl}/${id}/documento`, formData);
  }

  // Descargar documento de una entrega
  downloadDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/documento`, {
      responseType: 'blob'
    });
  }

  // Calificar una entrega (solo profesores)
  calificarEntrega(id: number, calificacion: CalificacionDTO): Observable<EntregaResponseDTO> {
    return this.http.post<EntregaResponseDTO>(`${this.apiUrl}/${id}/calificar`, calificacion);
  }

  // Eliminar una entrega (solo admin)
  deleteEntrega(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Métodos específicos para profesores

  // Obtener entregas pendientes de calificación
  getEntregasPendientesCalificacion(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaResponseDTO>>(`${this.apiUrl}/pendientes`, { params });
  }

  // Contar entregas pendientes de calificación
  countEntregasPendientesCalificacion(): Observable<{pendientes: number}> {
    return this.http.get<{pendientes: number}>(`${this.apiUrl}/pendientes/count`);
  }

  // Métodos específicos para alumnos

  // Obtener entregas de un alumno (el alumno autenticado)
  getEntregasByAlumno(page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaResponseDTO>>(`${this.apiUrl}/alumno`, { params });
  }

  // Métodos de utilidad

  // Verificar si una entrega tiene documento
  tieneDocumento(entrega: EntregaResponseDTO): boolean {
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
  puedeSubirDocumento(entrega: EntregaResponseDTO): boolean {
    return entrega.estado === EstadoEntrega.PENDIENTE ||
           entrega.estado === EstadoEntrega.ENTREGADA;
  }

  // Verificar si una entrega está calificada
 // REEMPLAZAR el método estaCalificada() existente por este:
  estaCalificada(entrega: EntregaResponseDTO): boolean {
    // ✅ NUEVO: Las entregas fuera de plazo con nota 0 se consideran "calificadas automáticamente"
    if (entrega.estado === EstadoEntrega.FUERA_PLAZO && entrega.nota === 0) {
      return true;
    }

    // Lógica original para entregas normalmente calificadas
    return entrega.estado === EstadoEntrega.CALIFICADA &&
          entrega.nota !== undefined &&
          entrega.nota !== null;
  }

  // Formatear nota
  formatNota(entrega: EntregaResponseDTO): string {
    // ✅ NUEVO: Si es una entrega fuera de plazo con nota 0, mostrar la nota
    if (entrega.estado === EstadoEntrega.FUERA_PLAZO && entrega.nota === 0) {
      return '0.0/10';
    }

    // ✅ NUEVO: Si tiene nota (incluye nota 0 normal), mostrarla
    if (entrega.nota !== undefined && entrega.nota !== null) {
      return entrega.nota.toFixed(1) + '/10';
    }

    // Solo mostrar "Sin calificar" si realmente no tiene nota
    return 'Sin calificar';
  }

  // Verificar si una entrega está fuera de plazo
  estaFueraDePlazo(entrega: EntregaResponseDTO): boolean {
    return !!(entrega.estado === EstadoEntrega.FUERA_PLAZO);
  }


  puedeEditarEntrega(entrega: EntregaResponseDTO, tarea?: any): boolean {
    // No se puede editar si está calificada
    if (entrega.estado === EstadoEntrega.CALIFICADA) {
      return false;
    }

    // No se puede editar si está fuera de plazo
    if (entrega.estado === EstadoEntrega.FUERA_PLAZO) {
      return false;
    }

    // Verificar fecha límite si tenemos la tarea
    if (tarea?.fechaLimite) {
      return new Date(tarea.fechaLimite) >= new Date();
    }

    // Por defecto, permitir edición para estados PENDIENTE y ENTREGADA
    return entrega.estado === EstadoEntrega.PENDIENTE ||
          entrega.estado === EstadoEntrega.ENTREGADA;
  }

  getEntregasByTarea(tareaId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<EntregaResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<EntregaResponseDTO>>(`${this.apiUrl}/tarea/${tareaId}`, { params });
  }

  // Método para verificar si una entrega es automática por vencimiento
  esEntregaAutomaticaPorVencimiento(entrega: EntregaResponseDTO): boolean {
    return entrega.estado === EstadoEntrega.FUERA_PLAZO &&
         entrega.nota === 0 &&
         entrega.comentarios !== undefined &&
         entrega.comentarios.includes('ENTREGA FUERA DE PLAZO');
  }

  // Método para obtener texto de estado más detallado
  getEstadoTextoDetallado(estado: EstadoEntrega, entrega: EntregaResponseDTO): string {
    switch (estado) {
      case EstadoEntrega.PENDIENTE:
        return 'Pendiente de entrega';
      case EstadoEntrega.ENTREGADA:
        return 'Entregada - Pendiente calificación';
      case EstadoEntrega.CALIFICADA:
        return 'Calificada';
      case EstadoEntrega.FUERA_PLAZO:
        if (this.esEntregaAutomaticaPorVencimiento(entrega)) {
          return 'Vencida - Penalizada automáticamente';
        }
        return 'Entregada fuera de plazo';
      default:
        return 'Estado desconocido';
    }
  }

  // Calificar entrega con documento opcional
  calificarEntregaConDocumento(id: number, calificacion: CalificacionDTO, documento?: File): Observable<EntregaResponseDTO> {
    const formData = new FormData();
    formData.append('calificacion', JSON.stringify(calificacion));

    if (documento) {
      formData.append('documentoProfesor', documento);
    }
    return this.http.post<EntregaResponseDTO>(`${this.apiUrl}/${id}/calificar-con-documento`, formData);
  }

  // Descargar documento del profesor
  downloadDocumentoProfesor(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/documento-profesor`, {
      responseType: 'blob'
    });
  }

  // Verificar si una entrega tiene documento del profesor
  tieneDocumentoProfesor(entrega: EntregaResponseDTO): boolean {
    return entrega.nombreDocumentoProfesor !== undefined &&
          entrega.nombreDocumentoProfesor !== null &&
          entrega.nombreDocumentoProfesor !== '';
  }

  verificarEntregaExistenteLocal(tareaId: number, entregas: EntregaResponseDTO[]): boolean {
    return entregas.some(entrega => entrega.tarea?.id === tareaId);
  }

  editarCalificacion(id: number, calificacion: CalificacionDTO, documento?: File): Observable<EntregaResponseDTO> {
    if (documento) {
      // Con documento - usar el método que acepta FormData
      return this.calificarEntregaConDocumento(id, calificacion, documento);
    } else {
      // Sin documento - usar el método simple
      return this.calificarEntrega(id, calificacion);
    }
  }

  // Método para verificar si el profesor puede editar la calificación
  puedeProfesorEditarCalificacion(entrega: EntregaResponseDTO, profesorId?: number): boolean {
    // Solo se puede editar si está calificada
    if (entrega.estado !== EstadoEntrega.CALIFICADA) {
      return false;
    }

    // Verificar que el profesor logueado sea el dueño de la tarea
    if (profesorId && entrega.tarea?.profesor?.id !== profesorId) {
      return false;
    }

    return true;
  }
  eliminarDocumentoProfesor(id: number): Observable<EntregaResponseDTO> {
    return this.http.delete<EntregaResponseDTO>(`${this.apiUrl}/${id}/documento-profesor`);
  }



}
