
// Mapea a DocumentoDTO.java
export interface DocumentoDTO {
  nombreArchivo: string;
  tipoArchivo: string;
  contenido: Blob | ArrayBuffer; // En el backend es byte[]
}
