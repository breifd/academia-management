import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.checkAuth(route, state.url);
  }

  private checkAuth(route: ActivatedRouteSnapshot, url: string): Observable<boolean> {
    // Verificar autenticación básica
    if (!this.authService.isAuthenticated()) {
      console.log('Usuario no autenticado, redirigiendo a login...');
      this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
      return of(false);
    }

    // Verificar roles requeridos
    const requiredRoles = route.data['roles'] as RolUsuario[];
    if (requiredRoles && requiredRoles.length > 0) {
      const currentUserRole = this.authService.currentUserValue?.rol;

      if (!currentUserRole) {
        console.log('No se pudo obtener el rol del usuario');
        this.router.navigate(['/login']);
        return of(false);
      }

      if (!requiredRoles.includes(currentUserRole)) {
        console.log(`Acceso denegado. Rol requerido: ${requiredRoles}, Rol actual: ${currentUserRole}`);
        this.router.navigate(['/access-denied']);
        return of(false);
      }
    }

    // Si llegamos aquí, el usuario está autenticado y autorizado
    return of(true);
  }

  // Método auxiliar para verificar si un usuario tiene acceso a una ruta específica
  canAccessRoute(roles: RolUsuario[]): boolean {
    if (!this.authService.isAuthenticated()) {
      return false;
    }

    if (!roles || roles.length === 0) {
      return true; // Si no hay roles específicos requeridos, permitir acceso
    }

    const currentUserRole = this.authService.currentUserValue?.rol;
    return currentUserRole ? roles.includes(currentUserRole) : false;
  }
}
