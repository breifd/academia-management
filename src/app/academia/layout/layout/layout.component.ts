import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../navbar/navbar/navbar.component';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterModule, NavbarComponent],
  standalone: true,
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {

}
