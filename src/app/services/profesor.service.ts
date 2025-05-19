import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ProfesorEntity } from '../interfaces/profesor-entity';
import { Page } from '../interfaces/page';
import { map, Observable } from 'rxjs';
import { Usuario } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class ProfesorService {

  private apiUrl = "http://localhost:8080/api/profesores"; // URL de la API

  constructor(private http : HttpClient) { }


  // Obtener todos los profesores
  getProfesoresLista(): Observable<ProfesorEntity[]> {
    return this.http.get<ProfesorEntity[]>(`${this.apiUrl}/listar`);
  }

  //Obtener especialidades
  getEspecialidades(): Observable<string[]> {
    return this.getProfesoresLista().pipe(
      map(profesores=>{
        const especialidades= profesores.map( profe => profe.especialidad).filter(especialidad => especialidad !== null && especialidad !== undefined && especialidad !== '') as string[];
        return [...new Set(especialidades)].sort(); // Eliminar duplicados y ordenar
      })
    );
  }

   // Obtener todos los profesores paginados
  getProfesores(page: number = 0, size: number = 10, sort: string = 'apellido', direction: string = 'asc'): Observable<Page<ProfesorEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<ProfesorEntity>>(this.apiUrl, { params });
  }

  // Obtener un profesor por ID
  getProfesorById(id: number): Observable<ProfesorEntity> {
    return this.http.get<ProfesorEntity>(`${this.apiUrl}/${id}`);
  }

  // Buscar profesores por nombre o apellido
  searchProfesores(nombre: string = '', apellido: string = '', page: number = 0, size: number = 10, sort: string = 'apellido', direction: string = 'asc'): Observable<Page<ProfesorEntity>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('apellido', apellido)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<ProfesorEntity>>(`${this.apiUrl}/buscar`, { params });
  }

  // Buscar profesores por especialidad
  getByEspecialidad(especialidad: string, page: number = 0, size: number = 10, sort: string = 'apellido', direction: string = 'asc'): Observable<Page<ProfesorEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<ProfesorEntity>>(`${this.apiUrl}/especialidad/${especialidad}`, { params });
  }

  // Crear un nuevo profesor
  createProfesor(profesor: ProfesorEntity): Observable<ProfesorEntity> {
    return this.http.post<ProfesorEntity>(this.apiUrl, profesor);
  }

  // Actualizar un profesor existente
  updateProfesor(id: number, profesor: ProfesorEntity): Observable<ProfesorEntity> {
    return this.http.put<ProfesorEntity>(`${this.apiUrl}/${id}`, profesor);
  }

  // Eliminar un profesor
  deleteProfesor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
    createProfesorWithUser(profesor: ProfesorEntity, usuario: Usuario): Observable<ProfesorEntity> {
    const requestBody = {
      nombre: profesor.nombre,
      apellido: profesor.apellido,
      telefono: profesor.telefono,
      email: profesor.email,
      especialidad: profesor.especialidad,
      anhosExperiencia: profesor.anhosExperiencia,
      usuario: {
        username: usuario.username,
        password: usuario.password,
        nombre: usuario.nombre || profesor.nombre,
        apellido: usuario.apellido || profesor.apellido
      }
    };

    return this.http.post<ProfesorEntity>(`${this.apiUrl}/con-usuario`, requestBody);
  }

  // Actualizar profesor con opción de sincronizar usuario
  updateProfesorWithSync(id: number, profesor: ProfesorEntity, syncUsuario: boolean = false): Observable<ProfesorEntity> {
    // Si syncUsuario es true, se agrega el parámetro a la solicitud
    // para que el backend sepa que debe sincronizar el usuario
    let params = new HttpParams().set('syncUsuario', syncUsuario.toString());
    return this.http.put<ProfesorEntity>(`${this.apiUrl}/${id}`, profesor, { params });
  }
}
