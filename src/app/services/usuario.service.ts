
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UsuarioResponseDTO, RolUsuario, UsuarioCreateDTO, UsuarioDTO } from '../interfaces/usuario';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = 'http://localhost:8080/api'; // URL de la API

  constructor(private http: HttpClient) { }

  getUsuario(username: string): Observable<UsuarioResponseDTO>{
      return this.http.get<UsuarioResponseDTO>(`${this.apiUrl}/usuario/${username}`);
    }
    getAllUsuarios(): Observable<UsuarioResponseDTO[]> {
    return this.http.get<UsuarioResponseDTO[]>(`${this.apiUrl}/usuarios`);
  }

  getUsuariosByRol(rol: RolUsuario): Observable<UsuarioResponseDTO[]> {
    return this.http.get<UsuarioResponseDTO[]>(`${this.apiUrl}/usuarios/rol/${rol}`);
  }

  createUsuario(usuario: UsuarioCreateDTO): Observable<UsuarioResponseDTO> {
    return this.http.post<UsuarioResponseDTO>(`${this.apiUrl}/usuarios`, usuario);
  }

  updateUsuario(id: number, usuario: UsuarioDTO): Observable<UsuarioResponseDTO> {
    return this.http.put<UsuarioResponseDTO>(`${this.apiUrl}/usuarios/${id}`, usuario);
  }

  syncUsuarioName(id: number): Observable<UsuarioResponseDTO> {
    return this.http.put<UsuarioResponseDTO>(`${this.apiUrl}/usuarios/${id}/sync-name`, {});
  }

  deleteUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/usuarios/${id}`);
  }

  getUsuarioByProfesorId(profesorId: number): Observable<UsuarioResponseDTO> {
    return this.http.get<UsuarioResponseDTO>(`${this.apiUrl}/usuarios/profesor/${profesorId}`);
  }

  getUsuarioByAlumnoId(alumnoId: number): Observable<UsuarioResponseDTO> {
    return this.http.get<UsuarioResponseDTO>(`${this.apiUrl}/usuarios/alumno/${alumnoId}`);
  }
  checkUsernameExists(username: string): Observable<boolean> {
  return this.http.get<boolean>(`${this.apiUrl}/check-username/${username}`);
  }
}
