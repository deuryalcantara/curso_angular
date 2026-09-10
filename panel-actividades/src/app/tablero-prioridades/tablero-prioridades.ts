import { Component, computed, effect, signal } from '@angular/core';
import type {
  Actividad,
  EstadoActividad,
  FiltroEstado,
  FiltroPrioridad,
  Prioridad,
} from '../modelos/actividad';

@Component({
  selector: 'app-tablero-prioridades',
  templateUrl: './tablero-prioridades.html',
  styleUrl: './tablero-prioridades.css',
})
export class TableroPrioridades {
  private readonly orden: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

  protected readonly actividades = signal<Actividad[]>([
    { id: 1, titulo: 'Preparar estructura HTML', estado: 'completada', prioridad: 'alta', creadaEn: '2026-08-10', destacada: false },
    { id: 2, titulo: 'Revisar contraste', estado: 'en_progreso', prioridad: 'media', creadaEn: '2026-08-12', destacada: true },
    { id: 3, titulo: 'Practicar TypeScript', estado: 'pendiente', prioridad: 'alta', creadaEn: '2026-08-14', destacada: false },
    { id: 4, titulo: 'Comprobar vista estrecha', estado: 'pendiente', prioridad: 'baja', creadaEn: '2026-08-16', destacada: false },
    { id: 5, titulo: 'Ejecutar el build', estado: 'pendiente', prioridad: 'media', creadaEn: '2026-08-18', destacada: false },
  ]);

  protected readonly total = computed(() => this.actividades().length);
  protected readonly pendientes = computed(
    () => this.actividades().filter((actividad) => actividad.estado === 'pendiente').length,
  );
  protected readonly enProgreso = computed(
    () => this.actividades().filter((actividad) => actividad.estado === 'en_progreso').length,
  );
  protected readonly completadas = computed(
    () => this.actividades().filter((actividad) => actividad.estado === 'completada').length,
  );
  protected readonly porcentaje = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.completadas() / this.total()) * 100),
  );

  protected readonly termino = signal('');
  protected readonly filtroEstado = signal<FiltroEstado>('todas');
  protected readonly filtroPrioridad = signal<FiltroPrioridad>('todas');
  protected readonly seleccionadaId = signal<number | null>(null);

  protected readonly visibles = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es');
    const estado = this.filtroEstado();
    const prioridad = this.filtroPrioridad();

    return this.actividades()
      .filter((actividad) => termino === '' || actividad.titulo.toLocaleLowerCase('es').includes(termino))
      .filter((actividad) => estado === 'todas' || actividad.estado === estado)
      .filter((actividad) => prioridad === 'todas' || actividad.prioridad === prioridad)
      .sort((primera, segunda) => this.orden[primera.prioridad] - this.orden[segunda.prioridad]);
  });

  protected readonly mostradas = computed(() => this.visibles().length);
  protected readonly hayFiltros = computed(
    () =>
      this.termino().trim() !== '' ||
      this.filtroEstado() !== 'todas' ||
      this.filtroPrioridad() !== 'todas',
  );
  protected readonly mensajeVacio = computed(() =>
    this.total() === 0
      ? 'Todavia no hay actividades. Crea la primera para empezar.'
      : 'Ninguna actividad coincide con los filtros aplicados.',
  );
  protected readonly seleccionada = computed(
    () => this.actividades().find((actividad) => actividad.id === this.seleccionadaId()) ?? null,
  );

  protected alternarDestacada(id: number): void {
    this.actividades.update((actuales) =>
      actuales.map((actividad) =>
        actividad.id === id ? { ...actividad, destacada: !actividad.destacada } : actividad,
      ),
    );
  }

  protected avanzarEstado(id: number): void {
    this.actividades.update((actuales) =>
      actuales.map((actividad) =>
        actividad.id === id ? { ...actividad, estado: this.siguienteEstado(actividad.estado) } : actividad,
      ),
    );
  }

  protected eliminar(id: number): void {
    this.actividades.update((actuales) => actuales.filter((actividad) => actividad.id !== id));
    this.seleccionadaId.update((actual) => (actual === id ? null : actual));
  }

  protected buscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarFiltroEstado(evento: Event): void {
    this.filtroEstado.set((evento.target as HTMLSelectElement).value as FiltroEstado);
  }

  protected cambiarFiltroPrioridad(evento: Event): void {
    this.filtroPrioridad.set((evento.target as HTMLSelectElement).value as FiltroPrioridad);
  }

  protected limpiarFiltros(): void {
    this.termino.set('');
    this.filtroEstado.set('todas');
    this.filtroPrioridad.set('todas');
  }

  protected seleccionar(id: number): void {
    this.seleccionadaId.update((actual) => (actual === id ? null : id));
  }

  protected restablecer(): void {
    this.actividades.set([]);
    this.limpiarFiltros();
    this.seleccionadaId.set(null);
  }

  private siguienteEstado(estado: EstadoActividad): EstadoActividad {
    if (estado === 'pendiente') return 'en_progreso';
    if (estado === 'en_progreso') return 'completada';
    return 'completada';
  }

  constructor() {
    effect(() => {
      console.info(`[Tablero] ${this.mostradas()} de ${this.total()} visibles`);
    });
  }
}
