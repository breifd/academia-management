import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './services/auth.service';

// Interceptor funcional que SABEMOS que funciona
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('🚨🚨🚨 [JWT INTERCEPTOR] FUNCIONANDO PARA:', req.url);

  const token = localStorage.getItem('jwt_token');

  if (token) {
    console.log('✅ [JWT INTERCEPTOR] Token encontrado');

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('📤 [JWT INTERCEPTOR] Enviando con Authorization header');
    return next(authReq);
  }

  console.log('❌ [JWT INTERCEPTOR] Sin token, enviando sin header');
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Interceptor funcional
    provideHttpClient(withInterceptors([jwtInterceptor])),

    AuthService
  ]
};
