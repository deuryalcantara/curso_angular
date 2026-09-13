import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActividadesService } from '../actividades';
import type { Actividad } from '../../modelos/actividad';
import { ETIQUETAS } from '../../modelos/actividad';

type Resultado =
  | { estado: 'invalido' }
  | { estado: 'ausente'; id: number }
  | { estado: 'encontrada'; actividad: Actividad };

@Component({
  selector: 'app-detalle-actividad',
  imports: [RouterLink],
  templateUrl: './detalle-actividad.html',
  styleUrl: './detalle-actividad.css',
})
export class DetalleActividad {
  private readonly servicio = inject(ActividadesService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  protected readonly etiquetas = ETIQUETAS;

  protected readonly resultado = computed<Resultado>(() => {
    const numero = Number(this.id());
    if (!Number.isInteger(numero) || numero <= 0) return { estado: 'invalido' };

    const actividad = this.servicio.buscarPorId(numero);
    return actividad ? { estado: 'encontrada', actividad } : { estado: 'ausente', id: numero };
  });

  protected readonly actividad = computed(() => {
    const resultado = this.resultado();
    return resultado.estado === 'encontrada' ? resultado.actividad : null;
  });

  protected eliminar(): void {
    const actividad = this.actividad();
    if (!actividad) return;
    this.servicio.eliminar(actividad.id);
    this.router.navigate(['/actividades'], { replaceUrl: true });
  }
}
