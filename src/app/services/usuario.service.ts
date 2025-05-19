
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginRequest } from '../interfaces/login-request';
import { LoginResponse } from '../interfaces/login-response';
import { Observable } from 'rxjs';
import { Usuario } from '../interfaces/usuario';
import { UsuarioDTO } from '../interfaces/usuarioDTO';
import { RolUsuario } from '../enum/rol-usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = 'http://localhost:8080/api'; // URL de la API

  constructor(private http: HttpClient) { }

  getUsuario(username: string): Observable<Usuario>{
      return this.http.get<Usuario>(`${this.apiUrl}/usuario/${username}`);
    }
    getAllUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`);
  }

  getUsuariosByRol(rol: RolUsuario): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios/rol/${rol}`);
  }

  createUsuario(usuario: UsuarioDTO): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, usuario);
  }

  updateUsuario(id: number, usuario: UsuarioDTO): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${id}`, usuario);
  }

  syncUsuarioName(id: number): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${id}/sync-name`, {});
  }

  deleteUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/usuarios/${id}`);
  }

  getUsuarioByProfesorId(profesorId: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/profesor/${profesorId}`);
  }

  getUsuarioByAlumnoId(alumnoId: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/alumno/${alumnoId}`);
  }
  checkUsernameExists(username: string): Observable<boolean> {
  return this.http.get<boolean>(`${this.apiUrl}/check-username/${username}`);
  }
}
