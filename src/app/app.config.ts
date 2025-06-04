// app.config.ts - Configuración corregida

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './services/auth.service';

// ✅ INTERCEPTOR FUNCIONAL MEJORADO
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('🚨 [JWT INTERCEPTOR] URL:', req.url);

  // Rutas que NO necesitan token
  const publicRoutes = [
    '/api/login',
    '/api/register',
    '/api/public',
    '/api/debug-login',
    '/api/test-auth',
    '/api/bcrypt-info'
  ];

  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));

  if (isPublicRoute) {
    console.log('🟢 [JWT INTERCEPTOR] Ruta pública');
    return next(req);
  }

  // Obtener token
  const token = localStorage.getItem('jwt_token');

  if (!token) {
    console.log('❌ [JWT INTERCEPTOR] Sin token');
    return next(req);
  }

  // Verificar expiración
  if (isTokenExpired(token)) {
    console.log('⏰ [JWT INTERCEPTOR] Token expirado');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user');
    return next(req);
  }

  console.log('✅ [JWT INTERCEPTOR] Agregando token');

  // Clonar request con Authorization header
  const authReq = req.clone({
    setHeaders: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('📤 [JWT INTERCEPTOR] Request con Authorization header enviada');
  return next(authReq);
};

// Función auxiliar para verificar expiración
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('[JWT INTERCEPTOR] Error:', error);
    return true;
  }
}

// ✅ CONFIGURACIÓN DE LA APP
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // ✅ USAR SOLO EL INTERCEPTOR FUNCIONAL
    provideHttpClient(withInterceptors([jwtInterceptor])),

    // Servicios
    AuthService
  ]
};

// ✅ DEBUGGING: Verificar token al cargar la app
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('jwt_token');
  const user = localStorage.getItem('current_user');

  console.log('🔍 [APP CONFIG] Token en localStorage:', token ? 'SÍ' : 'NO');
  console.log('🔍 [APP CONFIG] User en localStorage:', user ? 'SÍ' : 'NO');

  if (token) {
    console.log('🔍 [APP CONFIG] Token válido:', !isTokenExpired(token));
  }
}
