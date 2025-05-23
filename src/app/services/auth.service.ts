
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


import { LoginRequest, LoginResponse, RolUsuario, UsuarioEntity } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api'; // URL de la API
  private  currentUserSubject: BehaviorSubject<LoginResponse | null>; // Subject para almacenar el usuario actual, se actualiza cada vez que el usuario inicia sesión o cierra sesión
  public currentUser: Observable<LoginResponse | null>;// Observable para que otros componentes puedan suscribirse a los cambios en el usuario actual


  constructor(
    private http: HttpClient,
    private router: Router)
    {
      const user = sessionStorage.getItem('currentUser'); // Obtiene el usuario del almacenamiento
      this.currentUserSubject = new BehaviorSubject<LoginResponse | null>(user ? JSON.parse(user) : null);// Inicializa el BehaviorSubject con el usuario actual si existe
      this.currentUser = this.currentUserSubject.asObservable(); // Observable para que otros componentes puedan suscribirse a los cambios
    }

  public get currentUserValue(): LoginResponse | null {
    return this.currentUserSubject.value;// Devuelve el valor actual del usuario
  }

  login(login: LoginRequest): Observable<LoginResponse> {
    // Realiza la solicitud de inicio de sesión a la API
    // y devuelve un observable con la respuesta+
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, login)
    .pipe(
      // Almacena el usuario en el almacenamiento local y actualiza el BehaviorSubject
      tap(response =>{
        // Si la respuesta es exitosa y contiene el nombre de usuario, nombre y apellido
        // almacena el usuario en el almacenamiento local y actualiza el BehaviorSubject
        if(response.success && response.username && response.nombre && response.apellido){
          sessionStorage.setItem('currentUser', JSON.stringify(response));
          this.currentUserSubject.next(response);
        }
      })
    );
  }

  logout(): void {
    // Eliminar el usuario del almacenamiento local
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);// Actualiza el BehaviorSubject a null
    // Redirige a la página de inicio de sesión
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    // Verifica si el usuario está autenticado
    // Esto se hace comprobando si el valor actual del usuario no es nulo
    return this.currentUserValue !== null;
  }
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
}
