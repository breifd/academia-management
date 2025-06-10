import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, RolUsuario } from '../interfaces/usuario';
import { API_CONFIG, ENDPOINTS } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${API_CONFIG.BASE_URL}`;
  private currentUserSubject: BehaviorSubject<LoginResponse | null>;
  public currentUser: Observable<LoginResponse | null>;

  private readonly TOKEN_KEY = 'jwt_token';
  private readonly USER_KEY = 'current_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Inicializar con datos del localStorage
    const user = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<LoginResponse | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();

    // Verificar si el token sigue siendo válido al iniciar
    this.checkTokenValidity();
  }

  public get currentUserValue(): LoginResponse | null {
    return this.currentUserSubject.value;
  }

 login(loginRequest: LoginRequest): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginRequest)
    .pipe(
      tap(response => {
        console.log('Respuesta completa de login:', response);

        if (response.success && response.token) {
          console.log('¡Token recibido! Guardando...');
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response));
          this.currentUserSubject.next(response);
        } else {
          console.error('No se recibió token o success=false');
        }
      })
    );
}

  logout(): void {
    // Limpiar token y datos del usuario
    this.removeToken();
    this.removeStoredUser();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Gestión del token
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // Gestión de datos del usuario
  private getStoredUser(): LoginResponse | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.removeStoredUser();
      }
    }
    return null;
  }

  private setStoredUser(user: LoginResponse): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private removeStoredUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  // Verificaciones de autenticación
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    return !!(token && user && !this.isTokenExpired(token));
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  private checkTokenValidity(): void {
    const token = this.getToken();
    if (token && this.isTokenExpired(token)) {
      console.log('Token expired, logging out...');
      this.logout();
    }
  }

  // Métodos de verificación de roles
  hasRole(rol: RolUsuario): boolean {
    return this.currentUserValue?.rol === rol;
  }

  isAdmin(): boolean {
    return this.hasRole(RolUsuario.ADMIN);
  }

  isProfesor(): boolean {
    return this.hasRole(RolUsuario.PROFESOR);
  }

  isAlumno(): boolean {
    return this.hasRole(RolUsuario.ALUMNO);
  }

  // Refrescar información del usuario desde el servidor
  refreshUserInfo(): Observable<LoginResponse> {
    return this.http.get<LoginResponse>(`${this.apiUrl}/me`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Mantener el token actual pero actualizar la info del usuario
            const currentToken = this.getToken();
            if (currentToken) {
              response.token = currentToken;
            }
            this.setStoredUser(response);
            this.currentUserSubject.next(response);
          }
        })
      );
  }

  // Refrescar token
  refreshToken(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/refresh-token`, {})
      .pipe(
        tap(response => {
          if (response.token) {
            this.setToken(response.token);
            // Actualizar el usuario con el nuevo token
            const currentUser = this.currentUserValue;
            if (currentUser) {
              currentUser.token = response.token;
              this.setStoredUser(currentUser);
              this.currentUserSubject.next(currentUser);
            }
          }
        })
      );
  }
}
