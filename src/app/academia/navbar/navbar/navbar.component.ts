import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  collapsed = true;

  constructor(private authService : AuthService){} // Variable para controlar el estado del menú desplegable

  toggleNavbar() {
    this.collapsed = !this.collapsed; // Cambia el estado del menú desplegable
  }

  logout():void {
    this.authService.logout(); // Llama al método de cierre de sesión del servicio de autenticación
  }
}
