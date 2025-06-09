
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';
import { UsuarioResponseDTO, RolUsuario, UsuarioCreateDTO, UsuarioDTO } from '../interfaces/usuario';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = `${this.getApiUrl()}`;

  private getApiUrl(): string {
    return window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api'
      : 'https://tu-backend-railway.up.railway.app/api';
  }

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

cambiarPassword(username: string, passwordActual: string, passwordNueva: string): Observable<{message: string}> {
    const payload = {
      username: username,
      passwordActual: passwordActual,
      passwordNueva: passwordNueva
    };

    console.log('🔐 Cambiando contraseña para usuario:', username);

    return this.http.post<{message: string}>(`${this.apiUrl}/cambiar-password`, payload).pipe(
      tap(result => console.log('✅ Contraseña cambiada exitosamente')),
      catchError(error => {
        console.error('❌ Error al cambiar contraseña:', error);
        throw error;
      })
    );
  }

  /**
   * Método específico para actualizar datos de usuario (para admins)
   */
  updateUsuarioAdmin(usuarioId: number, datos: any): Observable<UsuarioResponseDTO> {
    console.log('👑 Actualizando datos de administrador:', {
      usuarioId,
      datos
    });

    return this.http.put<UsuarioResponseDTO>(`${this.apiUrl}/usuarios/${usuarioId}`, datos).pipe(
      tap(result => console.log('✅ Administrador actualizado exitosamente:', result)),
      catchError(error => {
        console.error('❌ Error al actualizar administrador:', error);
        throw error;
      })
    );
  }

  updatePerfilAdministrador(usuarioId: number, datos: {nombre: string, apellido: string}): Observable<any> {
  console.log('👑 Actualizando perfil de administrador:', {
    usuarioId,
    datos
  });

  return this.http.put<any>(`${this.apiUrl}/admin/${usuarioId}/perfil`, datos).pipe(
    tap(result => console.log('✅ Perfil de admin actualizado exitosamente:', result)),
    catchError(error => {
      console.error('❌ Error al actualizar perfil de admin:', error);
      throw error;
    })
  );
}

}
