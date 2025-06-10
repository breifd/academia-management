// app.config.ts - Configuración corregida para Railway

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './services/auth.service';

export const API_CONFIG = {
  // 🔥 URLs CORREGIDAS
  PRODUCTION_URL: 'https://back-academiafinal-production.up.railway.app/api',
  LOCAL_URL: 'http://localhost:8080/api',

  get BASE_URL(): string {
    const isLocal = window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '0.0.0.0';

    // 🆕 NUEVA LÓGICA: Detectar si estamos en Railway por el hostname
    const isRailway = window.location.hostname.includes('railway.app') ||
                     window.location.hostname.includes('up.railway.app');

    let url: string;

    if (isLocal) {
      url = this.LOCAL_URL;
      console.log('🏠 [API CONFIG] Usando entorno LOCAL');
    } else if (isRailway || !isLocal) {
      url = this.PRODUCTION_URL;
      console.log('🚀 [API CONFIG] Usando entorno PRODUCCIÓN (Railway)');
    } else {
      url = this.PRODUCTION_URL;
      console.log('🌐 [API CONFIG] Usando entorno PRODUCCIÓN por defecto');
    }

    console.log('🌐 [API CONFIG] URL Final:', url);
    console.log('🌐 [API CONFIG] Frontend hostname:', window.location.hostname);

    return url;
  }
};

// Endpoints específicos (sin cambios)
export const ENDPOINTS = {
  ALUMNOS: '/alumnos',
  PROFESORES: '/profesores',
  CURSOS: '/cursos',
  TAREAS: '/tareas',
  ENTREGAS: '/entregas',
  USUARIOS: '', // 🔥 IMPORTANTE: Los endpoints de usuario están en la raíz
  AUTH: '', // 🔥 IMPORTANTE: Los endpoints de auth están en la raíz
  LOGIN: '/login',
  REGISTER: '/register',
  CHANGE_PASSWORD: '/cambiar-password'
};

// ✅ INTERCEPTOR MEJORADO CON MEJOR DETECCIÓN DE RUTAS PÚBLICAS
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('🚨 [JWT INTERCEPTOR] URL completa:', req.url);

  // 🔥 RUTAS PÚBLICAS MEJORADAS
  const publicPaths = [
    '/login',
    '/register',
    '/debug-login',
    '/test-auth',
    '/bcrypt-info',
    '/public'
  ];

  // Verificar si es una ruta pública
  const isPublicRoute = publicPaths.some(path => req.url.includes(path));

  if (isPublicRoute) {
    console.log('🟢 [JWT INTERCEPTOR] Ruta pública detectada');
    return next(req);
  }

  // Obtener token
  const token = localStorage.getItem('jwt_token');

  if (!token) {
    console.log('❌ [JWT INTERCEPTOR] Sin token disponible');
    return next(req);
  }

  // Verificar expiración del token
  if (isTokenExpired(token)) {
    console.log('⏰ [JWT INTERCEPTOR] Token expirado, limpiando localStorage');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user');
    return next(req);
  }

  console.log('✅ [JWT INTERCEPTOR] Agregando token válido al request');

  // Clonar request con Authorization header
  const authReq = req.clone({
    setHeaders: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return next(authReq);
};

// Función auxiliar para verificar expiración del token
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;

    if (isExpired) {
      console.log('⏰ Token expirado. Exp:', new Date(payload.exp * 1000), 'Actual:', new Date());
    }

    return isExpired;
  } catch (error) {
    console.error('[JWT INTERCEPTOR] Error verificando token:', error);
    return true;
  }
}

// ✅ CONFIGURACIÓN DE LA APP
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    AuthService
  ]
};

// 🔥 DEBUGGING MEJORADO
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('jwt_token');
  const user = localStorage.getItem('current_user');

  console.log('🔍 [APP CONFIG DEBUG] ===== INFORMACIÓN DE CONFIGURACIÓN =====');
  console.log('🔍 [APP CONFIG] Frontend URL:', window.location.href);
  console.log('🔍 [APP CONFIG] Frontend hostname:', window.location.hostname);
  console.log('🔍 [APP CONFIG] API Base URL:', API_CONFIG.BASE_URL);
  console.log('🔍 [APP CONFIG] Token presente:', token ? 'SÍ' : 'NO');
  console.log('🔍 [APP CONFIG] User presente:', user ? 'SÍ' : 'NO');

  if (token) {
    const isValidToken = !isTokenExpired(token);
    console.log('🔍 [APP CONFIG] Token válido:', isValidToken);

    if (!isValidToken) {
      console.log('⚠️ [APP CONFIG] Token expirado, será removido automáticamente');
    }
  }

  console.log('🔍 [APP CONFIG] ===============================================');
}
