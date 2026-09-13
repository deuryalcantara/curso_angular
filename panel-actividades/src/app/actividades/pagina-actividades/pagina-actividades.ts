import { Component, computed, inject, signal } from '@angular/core';
import type { EstadoActividad, FiltroEstado, FiltroPrioridad, Prioridad } from '../../modelos/actividad';
import { ActividadesService } from '../actividades';
import { FiltrosActividades } from '../filtros-actividades/filtros-actividades';
import { ListaActividades } from '../lista-actividades/lista-actividades';
import { ResumenActividades } from '../resumen-actividades/resumen-actividades';
import { PanelSeccion } from '../../compartido/panel-seccion/panel-seccion';

@Component({
  selector: 'app-pagina-actividades',
  imports: [ResumenActividades, FiltrosActividades, ListaActividades, PanelSeccion],
  templateUrl: './pagina-actividades.html',
  styleUrl: './pagina-actividades.css',
})
export class PaginaActividades {
  private readonly servicio = inject(ActividadesService);
  private readonly orden: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

  protected readonly actividades = this.servicio.actividades;
  protected readonly aviso = this.servicio.aviso;
  protected readonly sinGuardar = this.servicio.sinGuardar;
  protected readonly total = this.servicio.total;
  protected readonly pendientes = this.servicio.pendientes;
  protected readonly enProgreso = this.servicio.enProgreso;
  protected readonly completadas = this.servicio.completadas;
  protected readonly porcentaje = this.servicio.porcentaje;

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
    () => this.termino().trim() !== '' || this.filtroEstado() !== 'todas' || this.filtroPrioridad() !== 'todas',
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
    this.servicio.alternarDestacada(id);
  }

  protected avanzarEstado(id: number): void {
    this.servicio.avanzarEstado(id);
  }

  protected eliminar(id: number): void {
    this.servicio.eliminar(id);
    this.seleccionadaId.update((actual) => (actual === id ? null : actual));
  }

  protected seleccionar(id: number): void {
    this.seleccionadaId.update((actual) => (actual === id ? null : id));
  }

  protected limpiarFiltros(): void {
    this.termino.set('');
    this.filtroEstado.set('todas');
    this.filtroPrioridad.set('todas');
  }

  protected restablecer(): void {
    this.servicio.vaciar();
    this.limpiarFiltros();
    this.seleccionadaId.set(null);
  }
}
