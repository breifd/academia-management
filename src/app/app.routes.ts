import { FormAlumnosComponent } from './academia/alumnos/form-alumnos/form-alumnos.component';
import { Routes } from '@angular/router';
import { LoginComponent } from './academia/login/login/login.component';
import { WelcomeComponent } from './academia/welcome/welcome/welcome.component';
import { LayoutComponent } from './academia/layout/layout/layout.component';
import { ProfesoresComponent } from './academia/profesores/lista-profesores/lista-profesores.component';
import { ListaAlumnosComponent } from './academia/alumnos/lista-alumnos/lista-alumnos.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    loadComponent: () => import('./academia/layout/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'welcome',
        loadComponent: () => import('./academia/welcome/welcome/welcome.component').then(m => m.WelcomeComponent)
      },
      {
        path: 'profesores',
        loadComponent: () => import('./academia/profesores/lista-profesores/lista-profesores.component').then(m => m.ProfesoresComponent)
      },
      {
        path: 'alumnos',
        loadComponent: () => import('./academia/alumnos/lista-alumnos/lista-alumnos.component').then(m => m.ListaAlumnosComponent)
      },
      {
        path: 'profesores/:id',
        loadComponent: () => import('./academia/profesores/form-profesores/form-profesores.component').then(m => m.FormProfesoresComponent)
      },
      {
        path: 'profesores/nuevo',
        loadComponent: () => import('./academia/profesores/form-profesores/form-profesores.component').then(m => m.FormProfesoresComponent)
      },
      {
        path: 'alumnos/:id',
        loadComponent: () => import('./academia/alumnos/form-alumnos/form-alumnos.component').then(m => m.FormAlumnosComponent)
      },
      {
        path: 'alumnos/nuevo',
        loadComponent: () => import('./academia/alumnos/form-alumnos/form-alumnos.component').then(m => m.FormAlumnosComponent)
      },
      {
        path: 'cursos',
        loadComponent: () => import('./academia/curso/lista-curso/lista-curso.component').then(m => m.ListaCursoComponent)
      },
      {
        path: 'cursos/:id',
        loadComponent: () => import('./academia/curso/form-curso/form-curso.component').then(m => m.FormCursoComponent)
      },
      {
        path: 'cursos/nuevo',
        loadComponent: () => import('./academia/curso/form-curso/form-curso.component').then(m => m.FormCursoComponent)
      },
      {
        path: 'tareas',
        loadComponent: () => import('./academia/tareas/lista-tareas/lista-tareas.component').then(m => m.ListaTareasComponent)
      },
      {
        path: 'tareas/:id',
        loadComponent: () => import('./academia/tareas/form-tareas/form-tareas.component').then(m => m.FormTareasComponent)
      },
      {
        path: 'tareas/nuevo',
        loadComponent: () => import('./academia/tareas/form-tareas/form-tareas.component').then(m => m.FormTareasComponent)
      },
      { path: '', redirectTo: 'welcome', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
