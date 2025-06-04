import { Injectable } from '@angular/core';
import { JwtPayload } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class JwtHelperService {

   constructor() { }

  /**
   * Decodifica un token JWT y retorna el payload
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      if (!token) return null;

      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Token JWT inválido');
      }

      const payload = parts[1];
      const decodedPayload = atob(payload);
      return JSON.parse(decodedPayload) as JwtPayload;
    } catch (error) {
      console.error('Error decodificando token JWT:', error);
      return null;
    }
  }

  /**
   * Verifica si un token ha expirado
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Obtiene el tiempo restante antes de que expire el token (en segundos)
   */
  getTimeUntilExpiration(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }

  /**
   * Verifica si el token expirará pronto (dentro de los próximos 5 minutos)
   */
  isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration(token);
    const thresholdSeconds = thresholdMinutes * 60;
    return timeUntilExpiration > 0 && timeUntilExpiration <= thresholdSeconds;
  }

  /**
   * Obtiene el username del token
   */
  getUsernameFromToken(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload ? payload.sub : null;
  }

  /**
   * Obtiene el rol del usuario del token
   */
  getRoleFromToken(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload ? payload.rol : null;
  }

  /**
   * Obtiene el ID del profesor del token (si existe)
   */
  getProfesorIdFromToken(token: string): number | null {
    const payload = this.decodeToken(token);
    return payload?.profesorId || null;
  }

  /**
   * Obtiene el ID del alumno del token (si existe)
   */
  getAlumnoIdFromToken(token: string): number | null {
    const payload = this.decodeToken(token);
    return payload?.alumnoId || null;
  }

  /**
   * Formatea el tiempo de expiración como una fecha legible
   */
  getExpirationDate(token: string): Date | null {
    const payload = this.decodeToken(token);
    if (!payload) return null;

    return new Date(payload.exp * 1000);
  }

  /**
   * Verifica si el token es válido estructuralmente
   */
  isValidTokenStructure(token: string): boolean {
    if (!token) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      // Verificar que se puede decodificar el header y payload
      atob(parts[0]);
      atob(parts[1]);
      return true;
    } catch {
      return false;
    }
  }
}
