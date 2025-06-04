
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';
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
  console.log('=== CHECK USERNAME REQUEST ===');
  console.log('Username a verificar:', username);
  console.log('Token actual:', localStorage.getItem('jwt_token'));
  console.log('Usuario actual:', localStorage.getItem('current_user'));

  let headers = new HttpHeaders();
  const token = localStorage.getItem('jwt_token');
  if (token) {
    headers= headers.set('Authorization', `Bearer ${token}`);
    console.log('Header Authorization agregado:', `Bearer ${token.substring(0, 20)}...`);
  } else {
    console.log('NO HAY TOKEN DISPONIBLE');
  }

  return this.http.get<boolean>(`${this.apiUrl}/check-username/${username}`, { headers }).pipe(
    tap(result => console.log('Resultado del servidor:', result)),
    catchError(error => {
      console.error('ERROR en checkUsernameExists:', error);
      console.log('Status:', error.status);
      console.log('Error completo:', error);
      console.log('================================');
      throw error;
    })
  );;
  }

  updateUsuarioAdmin(usuarioId: number, userData: any): Observable<UsuarioResponseDTO> {
  console.log('🔧 Actualizando usuario admin ID:', usuarioId, 'con datos:', userData);

  return this.http.put<UsuarioResponseDTO>(`${this.apiUrl}/usuarios/${usuarioId}`, userData).pipe(
    tap(response => console.log('✅ Usuario admin actualizado:', response)),
    catchError(error => {
      console.error('❌ Error actualizando usuario admin:', error);
      throw error;
    })
  );
}

// ✅ NUEVO: Cambiar contraseña de forma simple
cambiarPasswordSimple(username: string, passwordActual: string, passwordNueva: string): Observable<{message: string}> {
  console.log('🔐 Cambiando contraseña para usuario:', username);

  const passwordData = {
    username: username,
    currentPassword: passwordActual,
    newPassword: passwordNueva
  };

  return this.http.post<{message: string}>(`${this.apiUrl}/change-password`, passwordData).pipe(
    tap(response => console.log('✅ Contraseña cambiada exitosamente')),
    catchError(error => {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    })
  );
}

}
