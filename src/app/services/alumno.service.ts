import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Page } from '../interfaces/page';
import { Observable } from 'rxjs';
import { AlumnoCreateDTO, AlumnoEntity, AlumnoResponseDTO } from '../interfaces/alumno-entity';

import { CursoEntity, CursoSimpleDTO } from '../interfaces/curso-entity';


@Injectable({
  providedIn: 'root'
})
export class AlumnoService {

  private apiUrl="http://localhost:8080/api/alumnos";

  constructor(private http: HttpClient) { }

  //Metodo para obtener todos los alumnos
  getAlumnos(page:number=0, size:number=10, sort:string="apellido", direction:string="asc"): Observable<Page<AlumnoResponseDTO>>{

    // Se crea un objeto HttpParams para agregar los parámetros de paginación y ordenamiento a la solicitud
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);
    return this.http.get<Page<AlumnoResponseDTO>>(`${this.apiUrl}`,{ params });
  }

  getAlumnoByID(id:number): Observable<AlumnoResponseDTO>{
    // Se obtiene un alumno por su ID
    return this.http.get<AlumnoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  getTotalAlumnos(): Observable<Page<AlumnoResponseDTO>> {
    // Obtenemos solo 1 elemento por página para minimizar la transferencia de datos
    // pero obtenemos el totalElements que es lo que necesitamos
    let params = new HttpParams()
      .set('page', '0')
      .set('size', '1');
    return this.http.get<Page<AlumnoResponseDTO>>(`${this.apiUrl}`, { params });
  }

  getCursosByAlumno(alumnoId: number, page: number = 0, size: number = 10, sort: string = 'id', direction: string = 'asc'): Observable<Page<CursoSimpleDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<CursoSimpleDTO>>(`${this.apiUrl}/${alumnoId}/cursos`, { params });
  }

  searchAlumnos(nombre:string, apellido:string, page:number=0, size:number=10, sort:string="apellido", direction:string="asc"): Observable<Page<AlumnoResponseDTO>>{
    // Se crea un objeto HttpParams para agregar los parámetros de búsqueda, paginación y ordenamiento a la solicitud
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('apellido', apellido)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);
    return this.http.get<Page<AlumnoResponseDTO>>(`${this.apiUrl}/buscar`,{ params });
  }

  createAlumno(alumno: AlumnoCreateDTO): Observable<AlumnoResponseDTO> {
    // Validar que incluya datos de usuario
    if (!alumno.usuario) {
      throw new Error('Los datos de usuario son obligatorios para crear un alumno');
    }
    return this.http.post<AlumnoResponseDTO>(this.apiUrl, alumno);
  }


  // Actualizar un alumno existente
  updateAlumno(id: number, alumno: AlumnoCreateDTO): Observable<AlumnoCreateDTO> {
    return this.http.put<AlumnoCreateDTO>(`${this.apiUrl}/${id}`, alumno);
  }

  // Eliminar un alumno
  deleteAlumno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }


  // Actualizar alumno con opción de sincronizar usuario
  updateAlumnoWithSync(id: number, alumno: AlumnoCreateDTO, syncUsuario: boolean = false): Observable<AlumnoResponseDTO> {
    // Se crea un objeto HttpParams para agregar el parámetro de sincronización a la solicitud
    // Si syncUsuario es true, se agrega el parámetro a la solicitud
    let params = new HttpParams().set('syncUsuario', syncUsuario.toString());
    return this.http.put<AlumnoResponseDTO>(`${this.apiUrl}/${id}`, alumno, { params });
  }

  validateAlumnoData(alumno: AlumnoCreateDTO): string | null {
    if (!alumno.nombre || alumno.nombre.trim().length === 0) {
      return 'El nombre es obligatorio';
    }

    if (!alumno.apellido || alumno.apellido.trim().length === 0) {
      return 'El apellido es obligatorio';
    }

    if (!alumno.usuario) {
      return 'Los datos de usuario son obligatorios';
    }

    if (!alumno.usuario.username || alumno.usuario.username.trim().length < 4) {
      return 'El nombre de usuario debe tener al menos 4 caracteres';
    }

    if (!alumno.usuario.password || alumno.usuario.password.trim().length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    return null; // Sin errores
  }
}
