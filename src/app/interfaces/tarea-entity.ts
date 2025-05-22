import { AlumnoEntity } from "./alumno-entity";
import { CursoEntity } from "./curso-entity";
import { ProfesorEntity } from "./profesor-entity";

export interface TareaEntity {
    id?: number;
    nombre: string;
    descripcion?: string;
    fechaPublicacion?: string;
    fechaLimite?: string;
    documento?: any;
    nombreDocumento?: string;
    tipoDocumento?: string;
    curso?: CursoEntity;
    profesor?: ProfesorEntity;
    paraTodosLosAlumnos?: boolean;
    alumnosAsignados?: AlumnoEntity[]
}

export interface TareaDTO{
    id?: number;
    nombre: string;
    descripcion?: string;
    fechaPublicacion?: string;
    fechaLimite?: string;
    cursoId: number;
    paraTodosLosAlumnos?: boolean;
    alumnosIds?: number[];
}
