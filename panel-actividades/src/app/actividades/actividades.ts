import { computed, inject, Injectable, signal } from '@angular/core';
import { AlmacenamientoService } from '../compartido/almacenamiento';
import type { Actividad, EstadoActividad } from '../modelos/actividad';
import { esColeccionActividades } from '../modelos/actividad';

const CLAVE = 'panel.actividades.v1';

const INICIALES: readonly Actividad[] = [
  { id: 1, titulo: 'Preparar estructura HTML', estado: 'completada', prioridad: 'alta', creadaEn: '2026-08-10', destacada: false },
  { id: 2, titulo: 'Revisar contraste', estado: 'en_progreso', prioridad: 'media', creadaEn: '2026-08-12', destacada: true },
  { id: 3, titulo: 'Practicar TypeScript', estado: 'pendiente', prioridad: 'alta', creadaEn: '2026-08-14', destacada: false },
  { id: 4, titulo: 'Comprobar vista estrecha', estado: 'pendiente', prioridad: 'baja', creadaEn: '2026-08-16', destacada: false },
  { id: 5, titulo: 'Ejecutar el build', estado: 'pendiente', prioridad: 'media', creadaEn: '2026-08-18', destacada: false },
];

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private readonly almacen = inject(AlmacenamientoService);
  private readonly lista = signal<Actividad[]>(INICIALES.map((actividad) => ({ ...actividad })));

  readonly actividades = this.lista.asReadonly();
  readonly aviso = signal('');
  readonly sinGuardar = signal(false);
  readonly total = computed(() => this.lista().length);
  readonly pendientes = computed(() => this.lista().filter((a) => a.estado === 'pendiente').length);
  readonly enProgreso = computed(() => this.lista().filter((a) => a.estado === 'en_progreso').length);
  readonly completadas = computed(() => this.lista().filter((a) => a.estado === 'completada').length);
  readonly porcentaje = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.completadas() / this.total()) * 100),
  );

  constructor() {
    this.cargar();
    window.addEventListener('storage', (evento) => {
      if (evento.key === CLAVE) this.cargar();
    });
  }

  buscarPorId(id: number): Actividad | undefined {
    return this.lista().find((actividad) => actividad.id === id);
  }

  alternarDestacada(id: number): void {
    this.aplicar((actual) => actual.map((a) => (a.id === id ? { ...a, destacada: !a.destacada } : a)));
  }

  avanzarEstado(id: number): void {
    this.aplicar((actual) => actual.map((a) => (a.id === id ? { ...a, estado: this.siguienteEstado(a.estado) } : a)));
  }

  eliminar(id: number): void {
    this.aplicar((actual) => actual.filter((a) => a.id !== id));
  }

  vaciar(): void {
    this.aplicar(() => []);
  }

  private aplicar(cambio: (actual: Actividad[]) => Actividad[]): void {
    this.lista.update(cambio);
    this.guardar();
  }

  private guardar(): void {
    this.sinGuardar.set(!this.almacen.guardar(CLAVE, this.lista()));
  }

  private cargar(): void {
    if (!this.almacen.existe(CLAVE)) return;

    const valor = this.almacen.leer(CLAVE);
    if (!esColeccionActividades(valor)) {
      this.aviso.set('Lo que habia guardado no se pudo leer. Empiezas con las actividades de ejemplo.');
      return;
    }

    this.lista.set(valor.map((actividad) => ({ ...actividad })));
  }

  private siguienteEstado(estado: EstadoActividad): EstadoActividad {
    if (estado === 'pendiente') return 'en_progreso';
    if (estado === 'en_progreso') return 'completada';
    return 'completada';
  }
}