import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AlumnoEntity } from '../interfaces/alumno-entity';
import { Page } from '../interfaces/page';
import { Observable } from 'rxjs';
import { Usuario } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class AlumnoService {

  private apiUrl="http://localhost:8080/api/alumnos";

  constructor(private http: HttpClient) { }

  //Metodo para obtener todos los alumnos
  getAlumnos(page:number=0, size:number=10, sort:string="apellido", direction:string="asc"): Observable<Page<AlumnoEntity>>{

    // Se crea un objeto HttpParams para agregar los parámetros de paginación y ordenamiento a la solicitud
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);
    return this.http.get<Page<AlumnoEntity>>(`${this.apiUrl}`,{ params });
  }

  getAlumnoByID(id:number): Observable<AlumnoEntity>{
    // Se obtiene un alumno por su ID
    return this.http.get<AlumnoEntity>(`${this.apiUrl}/${id}`);
  }

  getTotalAlumnos(): Observable<Page<AlumnoEntity>> {
    // Obtenemos solo 1 elemento por página para minimizar la transferencia de datos
    // pero obtenemos el totalElements que es lo que necesitamos
    let params = new HttpParams()
      .set('page', '0')
      .set('size', '1');
    return this.http.get<Page<AlumnoEntity>>(`${this.apiUrl}`, { params });
  }

  searchAlumnos(nombre:string, apellido:string, page:number=0, size:number=10, sort:string="apellido", direction:string="asc"): Observable<Page<AlumnoEntity>>{
    // Se crea un objeto HttpParams para agregar los parámetros de búsqueda, paginación y ordenamiento a la solicitud
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('apellido', apellido)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('direction', direction);
    return this.http.get<Page<AlumnoEntity>>(`${this.apiUrl}/buscar`,{ params });
  }

  createAlumno(alumno: AlumnoEntity): Observable<AlumnoEntity> {
    return this.http.post<AlumnoEntity>(this.apiUrl, alumno);
  }

  // Actualizar un alumno existente
  updateAlumno(id: number, alumno: AlumnoEntity): Observable<AlumnoEntity> {
    return this.http.put<AlumnoEntity>(`${this.apiUrl}/${id}`, alumno);
  }

  // Eliminar un alumno
  deleteAlumno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

   createAlumnoWithUser(alumno: AlumnoEntity, usuario: Usuario): Observable<AlumnoEntity> {
    const requestBody = {
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      fechaNacimiento: alumno.fechaNacimiento,
      telefono: alumno.telefono,
      email: alumno.email,
      direccion: alumno.direccion,
      usuario: {
        username: usuario.username,
        password: usuario.password,
        nombre: usuario.nombre || alumno.nombre,
        apellido: usuario.apellido || alumno.apellido
      }
    };

    return this.http.post<AlumnoEntity>(`${this.apiUrl}/con-usuario`, requestBody);
  }

  // Actualizar alumno con opción de sincronizar usuario
  updateAlumnoWithSync(id: number, alumno: AlumnoEntity, syncUsuario: boolean = false): Observable<AlumnoEntity> {
    // Se crea un objeto HttpParams para agregar el parámetro de sincronización a la solicitud
    // Si syncUsuario es true, se agrega el parámetro a la solicitud
    let params = new HttpParams().set('syncUsuario', syncUsuario.toString());
    return this.http.put<AlumnoEntity>(`${this.apiUrl}/${id}`, alumno, { params });
  }
}
