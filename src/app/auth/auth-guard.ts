import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../enum/rol-usuario';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const requiredRoles = route.data['roles'] as RolUsuario[];
    if (requiredRoles && requiredRoles.length > 0) {
      const currentUserRole = this.authService.currentUserValue?.rol;
      if (!currentUserRole || !requiredRoles.includes(currentUserRole)) {
        this.router.navigate(['/access-denied']);
        return false;
      }
    }

    return true;
  }
}
