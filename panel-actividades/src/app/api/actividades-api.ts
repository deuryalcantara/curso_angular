import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type { Actividad, Prioridad } from '../modelos/actividad';

interface ActividadRemota {
  id: number;
  task_title: string;
  description: string | null;
  priority_level: number;
  is_done: boolean;
  created_at: string;
}

export interface DatosActividadRemota {
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  completada: boolean;
  creadaEn?: string;
}

const PRIORIDADES: Record<number, Prioridad> = { 1: 'baja', 2: 'media', 3: 'alta' };
const NIVELES: Record<Prioridad, number> = { baja: 1, media: 2, alta: 3 };

export function esActividadRemota(valor: unknown): valor is ActividadRemota {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const candidato = valor as Record<string, unknown>;

  return (
    typeof candidato['id'] === 'number' &&
    Number.isInteger(candidato['id']) &&
    typeof candidato['task_title'] === 'string' &&
    (typeof candidato['description'] === 'string' || candidato['description'] === null) &&
    typeof candidato['priority_level'] === 'number' &&
    typeof candidato['is_done'] === 'boolean' &&
    typeof candidato['created_at'] === 'string'
  );
}

export function aActividad(remota: ActividadRemota): Actividad {
  return {
    id: remota.id,
    titulo: remota.task_title,
    descripcion: remota.description ?? '',
    prioridad: PRIORIDADES[remota.priority_level] ?? 'media',
    estado: remota.is_done ? 'completada' : 'pendiente',
    creadaEn: remota.created_at.slice(0, 10),
    destacada: false,
  };
}

export function aActividades(datos: unknown): Actividad[] {
  return Array.isArray(datos) ? datos.filter(esActividadRemota).map(aActividad) : [];
}

function aCuerpoRemoto(datos: DatosActividadRemota): Record<string, unknown> {
  return {
    task_title: datos.titulo,
    description: datos.descripcion === '' ? null : datos.descripcion,
    priority_level: NIVELES[datos.prioridad],
    is_done: datos.completada,
    created_at: datos.creadaEn
      ? `${datos.creadaEn}T00:00:00.000Z`
      : new Date().toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class ActividadesApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/actividades';

  listar(): Observable<Actividad[]> {
    return this.http.get<unknown>(this.base).pipe(map(aActividades));
  }

  buscar(termino: string): Observable<Actividad[]> {
    const params = new HttpParams().set('q', termino);
    return this.http.get<unknown>(this.base, { params }).pipe(map(aActividades));
  }

  crear(datos: DatosActividadRemota): Observable<Actividad | null> {
    return this.http.post<unknown>(this.base, aCuerpoRemoto(datos)).pipe(
      map((respuesta) => esActividadRemota(respuesta) ? aActividad(respuesta) : null),
    );
  }

  actualizar(id: number, datos: DatosActividadRemota): Observable<Actividad | null> {
    return this.http.put<unknown>(`${this.base}/${id}`, aCuerpoRemoto(datos)).pipe(
      map((respuesta) => esActividadRemota(respuesta) ? aActividad(respuesta) : null),
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
