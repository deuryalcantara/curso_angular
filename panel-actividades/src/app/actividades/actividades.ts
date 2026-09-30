import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, concatMap, finalize, from, of, retry, timer } from 'rxjs';
import type { Actividad, EstadoActividad, Prioridad } from '../modelos/actividad';
import { LIMITES } from '../modelos/actividad';
import { ActividadesApi } from '../api/actividades-api';
import { mensajeDe } from '../api/mensajes';

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private readonly api = inject(ActividadesApi);
  private readonly lista = signal<Actividad[]>([]);

  readonly actividades = this.lista.asReadonly();
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly errorCarga = signal('');
  readonly total = computed(() => this.lista().length);
  readonly pendientes = computed(() => this.lista().filter((actividad) => actividad.estado === 'pendiente').length);
  readonly enProgreso = computed(() => this.lista().filter((actividad) => actividad.estado === 'en_progreso').length);
  readonly completadas = computed(() => this.lista().filter((actividad) => actividad.estado === 'completada').length);
  readonly porcentaje = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.completadas() / this.total()) * 100),
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.errorCarga.set('');

    this.api.listar().pipe(
      retry({ count: 2, delay: (_, intento) => timer(intento * 300) }),
      catchError((error: unknown) => {
        this.errorCarga.set(mensajeDe(error));
        return of<Actividad[]>([]);
      }),
      finalize(() => this.cargando.set(false)),
    ).subscribe((actividades) => this.lista.set(actividades));
  }

  buscarPorId(id: number): Actividad | undefined {
    return this.lista().find((actividad) => actividad.id === id);
  }

  crear(titulo: string, descripcion: string, prioridad: Prioridad): Actividad | null {
    const limpio = titulo.trim();
    if (!this.tituloAceptable(limpio, null)) return null;

    const provisional: Actividad = {
      id: this.siguienteId(),
      titulo: limpio,
      descripcion: descripcion.trim(),
      estado: 'pendiente',
      prioridad,
      creadaEn: new Date().toISOString().slice(0, 10),
      destacada: false,
    };

    this.error.set('');
    this.lista.update((actual) => [...actual, provisional]);
    this.api.crear({ titulo: limpio, descripcion: descripcion.trim(), prioridad, completada: false }).pipe(
      catchError((error: unknown) => this.deshacer(provisional.id, error)),
    ).subscribe((guardada) => {
      if (guardada) {
        this.reemplazar(provisional.id, guardada);
      } else if (!this.error()) {
        this.error.set('El servidor devolvió una actividad con un formato no válido.');
        this.quitarLocal(provisional.id);
      }
    });

    return provisional;
  }

  actualizar(id: number, titulo: string, descripcion: string, prioridad: Prioridad): boolean {
    const limpio = titulo.trim();
    const anterior = this.buscarPorId(id);
    if (!anterior || !this.tituloAceptable(limpio, id)) return false;

    const cambios = { titulo: limpio, descripcion: descripcion.trim(), prioridad };
    this.error.set('');
    this.aplicarLocal(id, cambios);
    this.enviar(id, anterior);
    return true;
  }

  alternarDestacada(id: number): void {
    const actividad = this.buscarPorId(id);
    if (actividad) this.aplicarLocal(id, { destacada: !actividad.destacada });
  }

  avanzarEstado(id: number): void {
    const actividad = this.buscarPorId(id);
    if (!actividad) return;
    this.aplicarLocal(id, { estado: this.siguienteEstado(actividad.estado) });
    this.enviar(id, actividad);
  }

  eliminar(id: number): void {
    const anterior = this.buscarPorId(id);
    if (!anterior) return;
    const indice = this.lista().findIndex((actividad) => actividad.id === id);

    this.error.set('');
    this.lista.update((actual) => actual.filter((actividad) => actividad.id !== id));
    this.api.eliminar(id).pipe(
      catchError((error: unknown) => {
        this.error.set(mensajeDe(error));
        this.restaurar(anterior, indice);
        return of(undefined);
      }),
    ).subscribe();
  }

  vaciar(): void {
    const anteriores = [...this.lista()];
    this.error.set('');
    this.lista.set([]);
    from(anteriores).pipe(
      concatMap((actividad) => this.api.eliminar(actividad.id).pipe(
        catchError((error: unknown) => {
          this.error.set(mensajeDe(error));
          this.lista.update((actual) => [...actual, actividad].sort((a, b) => a.id - b.id));
          return of(undefined);
        }),
      )),
    ).subscribe();
  }

  private tituloAceptable(limpio: string, salvo: number | null): boolean {
    if (limpio.length < LIMITES.tituloMin || limpio.length > LIMITES.tituloMax) return false;
    const normal = limpio.toLocaleLowerCase('es');
    return !this.lista().some(
      (actividad) => actividad.id !== salvo && actividad.titulo.toLocaleLowerCase('es') === normal,
    );
  }

  private siguienteId(): number {
    return this.lista().reduce((mayor, actividad) => Math.max(mayor, actividad.id), 0) + 1;
  }

  private enviar(id: number, anterior: Actividad): void {
    const actividad = this.buscarPorId(id);
    if (!actividad) return;
    this.error.set('');

    this.api.actualizar(id, {
      titulo: actividad.titulo,
      descripcion: actividad.descripcion,
      prioridad: actividad.prioridad,
      completada: actividad.estado === 'completada',
      creadaEn: actividad.creadaEn,
    }).pipe(
      catchError((error: unknown) => {
        this.error.set(mensajeDe(error));
        this.reemplazar(id, anterior);
        return of(null);
      }),
    ).subscribe((guardada) => {
      if (guardada) {
        this.reemplazar(id, { ...guardada, destacada: actividad.destacada });
      } else if (!this.error()) {
        this.error.set('El servidor devolvió una actividad con un formato no válido.');
        this.reemplazar(id, anterior);
      }
    });
  }

  private deshacer(id: number, error: unknown) {
    this.error.set(mensajeDe(error));
    this.quitarLocal(id);
    return of(null);
  }

  private aplicarLocal(id: number, cambios: Partial<Actividad>): void {
    this.lista.update((actual) => actual.map((actividad) =>
      actividad.id === id ? { ...actividad, ...cambios } : actividad,
    ));
  }

  private reemplazar(id: number, actividad: Actividad): void {
    this.lista.update((actual) => actual.map((item) => item.id === id ? actividad : item));
  }

  private quitarLocal(id: number): void {
    this.lista.update((actual) => actual.filter((actividad) => actividad.id !== id));
  }

  private restaurar(actividad: Actividad, indice: number): void {
    this.lista.update((actual) => {
      const siguiente = [...actual];
      siguiente.splice(Math.min(indice, siguiente.length), 0, actividad);
      return siguiente;
    });
  }

  private siguienteEstado(estado: EstadoActividad): EstadoActividad {
    if (estado === 'pendiente') return 'en_progreso';
    if (estado === 'en_progreso') return 'completada';
    return 'completada';
  }
}
