import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Log de debug - SIEMPRE debe aparecer si el interceptor funciona
    console.log('🚨 [JWT INTERCEPTOR] ¡¡¡INTERCEPTOR SE ESTÁ EJECUTANDO!!! URL:', req.url);

    // Verificar token
    const token = localStorage.getItem('jwt_token');

    if (token) {
      console.log('✅ [JWT INTERCEPTOR] Token encontrado, longitud:', token.length);
      console.log('🔑 [JWT INTERCEPTOR] Primeros 20 caracteres:', token.substring(0, 20) + '...');

      // Crear nueva request con Authorization header
      const authReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📤 [JWT INTERCEPTOR] Request enviada CON Authorization header');
      console.log('📋 [JWT INTERCEPTOR] Authorization header creado:', authReq.headers.get('Authorization')?.substring(0, 30) + '...');

      return next.handle(authReq);
    } else {
      console.log('❌ [JWT INTERCEPTOR] No hay token en localStorage');
    }

    console.log('📤 [JWT INTERCEPTOR] Request enviada SIN Authorization header');
    return next.handle(req);
  }
}
