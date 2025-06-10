import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Page } from '../interfaces/page';
import { map, Observable } from 'rxjs';
import { ProfesorCreateDTO, ProfesorResponseDTO, ProfesorSimpleDTO } from '../interfaces/profesor-entity';
import { API_CONFIG, ENDPOINTS } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class ProfesorService {

  private apiUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.PROFESORES}`;

  constructor(private http: HttpClient) { }

  // Obtener todos los profesores
  getProfesoresLista(): Observable<ProfesorSimpleDTO[]> {
    return this.http.get<ProfesorSimpleDTO[]>(`${this.apiUrl}/listar`);
  }

  // Obtener especialidades
  getEspecialidades(): Observable<string[]> {
    return this.getProfesoresLista().pipe(
      map(profesores => {
        const especialidades = profesores.map(profe => profe.especialidad)
          .filter(especialidad => especialidad !== null && especialidad !== undefined && especialidad !== '') as string[];
        return [...new Set(especialidades)].sort();
      })
    );
  }

  // Obtener todos los profesores paginados
  getProfesores(page: number = 0, size: number = 10, sort: string = 'apellido', direction: string = 'asc'): Observable<Page<ProfesorResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<ProfesorResponseDTO>>(this.apiUrl, { params });
  }

  // Obtener un profesor por ID
  getProfesorById(id: number): Observable<ProfesorResponseDTO> {
    return this.http.get<ProfesorResponseDTO>(`${this.apiUrl}/${id}`);
  }

  // Buscar profesores por nombre o apellido
  searchProfesores(nombre: string = '', apellido: string = '', page: number = 0, size: number = 10, sort: string = 'apellido', direction: string = 'asc'): Observable<Page<ProfesorResponseDTO>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('apellido', apellido)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<ProfesorResponseDTO>>(`${this.apiUrl}/buscar`, { params });
  }

  // Buscar profesores por especialidad
  getByEspecialidad(especialidad: string, page: number = 0, size: number = 10, sort: string = 'apellido', direction: string = 'asc'): Observable<Page<ProfesorResponseDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<ProfesorResponseDTO>>(`${this.apiUrl}/especialidad/${especialidad}`, { params });
  }

  // CAMBIO: Ahora siempre crea con usuario (obligatorio)
  createProfesor(profesor: ProfesorCreateDTO): Observable<ProfesorResponseDTO> {
    // Validar que incluya datos de usuario
    if (!profesor.usuario) {
      throw new Error('Los datos de usuario son obligatorios para crear un profesor');
    }
    return this.http.post<ProfesorResponseDTO>(this.apiUrl, profesor);
  }

  // Actualizar un profesor existente
  updateProfesor(id: number, profesor: ProfesorCreateDTO): Observable<ProfesorResponseDTO> {
    return this.http.put<ProfesorResponseDTO>(`${this.apiUrl}/${id}`, profesor);
  }

  // Eliminar un profesor
  deleteProfesor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ELIMINADO: Ya no necesitamos createProfesorWithUser por separado
  // porque ahora siempre se crea con usuario

  // Actualizar profesor con opción de sincronizar usuario
  updateProfesorWithSync(id: number, profesor: ProfesorCreateDTO, syncUsuario: boolean = false): Observable<ProfesorResponseDTO> {
    let params = new HttpParams().set('syncUsuario', syncUsuario.toString());
    return this.http.put<ProfesorResponseDTO>(`${this.apiUrl}/${id}`, profesor, { params });
  }

  // HELPER: Validar datos de profesor antes de enviar
  validateProfesorData(profesor: ProfesorCreateDTO): string | null {
    if (!profesor.nombre || profesor.nombre.trim().length === 0) {
      return 'El nombre es obligatorio';
    }

    if (!profesor.apellido || profesor.apellido.trim().length === 0) {
      return 'El apellido es obligatorio';
    }

    if (!profesor.especialidad || profesor.especialidad.trim().length === 0) {
      return 'La especialidad es obligatoria';
    }

    if (profesor.anhosExperiencia === null || profesor.anhosExperiencia === undefined || profesor.anhosExperiencia < 0) {
      return 'Los años de experiencia son obligatorios y deben ser mayores o iguales a 0';
    }

    if (!profesor.usuario) {
      return 'Los datos de usuario son obligatorios';
    }

    if (!profesor.usuario.username || profesor.usuario.username.trim().length < 4) {
      return 'El nombre de usuario debe tener al menos 4 caracteres';
    }

    if (!profesor.usuario.password || profesor.usuario.password.trim().length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    return null; // Sin errores
  }
}
