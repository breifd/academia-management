import { tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  // Propiedades Input para recibir datos del componente padre
  @Input() currentPage: number = 0;
  @Input() totalPages: number = 0;
  @Input() pageSize: number = 10;
  @Input() totalElements: number = 0;

  //Se crea un evento para emitir el cambio de página
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    // Si el total de páginas es menor o igual al máximo a mostrar, se muestran todas
    if (this.totalPages <= maxPagesToShow) {
      // Si hay pocas páginas, mostrarlas todas
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
      } else {
      // Si hay muchas páginas, mostrar un rango centrado alrededor de la página actual
      // Calcular el rango de páginas a mostrar
      let startPage = Math.max(0, this.currentPage - 2);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 2);

      // Ajustar si estamos cerca del inicio o del final
      if (this.currentPage < 2) {
        endPage = 4;
      } else if (this.currentPage > this.totalPages - 3) {
        startPage = this.totalPages - 5;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
  // Método para cambiar de página
  // Se emite el evento pageChange con la nueva página seleccionada
  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.pageChange.emit(page);
    }
  }
  // Método para ir a la primera página
  get startItem(): number {
    return this.currentPage * this.pageSize + 1;
  }
  // Método para ir a la última página
  get endItem(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }
}
