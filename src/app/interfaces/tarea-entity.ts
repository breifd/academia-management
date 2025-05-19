export interface TareaEntity {
    id?: number;
    nombre: string;
    descripcion?: string;
    fechaPublicacion?: string;
    fechaLimite?: string;
    documento?: any; // Este campo no se usará directamente en formularios
    nombreDocumento?: string;
    tipoDocumento?: string;
    nota?: number | null; // null representa "No presentado"
}
