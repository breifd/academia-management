// jwt-interceptor-functional.ts - Interceptor funcional mejorado

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  console.log('🚨🚨🚨 [JWT INTERCEPTOR FUNCIONAL] Interceptando:', req.url);

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
    console.log('🟢 [JWT INTERCEPTOR] Ruta pública, sin token necesario');
    return next(req);
  }

  // Obtener token desde localStorage
  const token = localStorage.getItem('jwt_token');

  if (!token) {
    console.log('❌ [JWT INTERCEPTOR] No hay token disponible');
    return next(req);
  }

  console.log('✅ [JWT INTERCEPTOR] Token encontrado');
  console.log('🔑 [JWT INTERCEPTOR] Token (primeros 30 chars):', token.substring(0, 30) + '...');

  // Verificar que el token no esté expirado
  if (isTokenExpired(token)) {
    console.log('⏰ [JWT INTERCEPTOR] Token expirado, removiendo...');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user');
    return next(req);
  }

  // Clonar request y agregar Authorization header
  const authReq = req.clone({
    setHeaders: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('📤 [JWT INTERCEPTOR] Request enviada CON token');
  console.log('📋 [JWT INTERCEPTOR] Authorization header:', authReq.headers.get('Authorization')?.substring(0, 50) + '...');

  return next(authReq);
};

// Función auxiliar para verificar expiración del token
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('[JWT INTERCEPTOR] Error decodificando token:', error);
    return true;
  }
}
