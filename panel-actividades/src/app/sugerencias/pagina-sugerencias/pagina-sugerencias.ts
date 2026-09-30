import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { mensajeDe } from '../../api/mensajes';

interface Sugerencia {
  titulo: string;
  motivo: string;
}

function esSugerencia(valor: unknown): valor is Sugerencia {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const registro = valor as Record<string, unknown>;
  return typeof registro['titulo'] === 'string' && typeof registro['motivo'] === 'string';
}

@Component({
  selector: 'app-pagina-sugerencias',
  templateUrl: './pagina-sugerencias.html',
  styleUrl: './pagina-sugerencias.css',
})
export class PaginaSugerencias {
  protected readonly recurso = httpResource<unknown>(() => '/sugerencias.json');
  protected readonly sugerencias = computed(() => {
    const datos = this.recurso.value();
    return Array.isArray(datos) ? datos.filter(esSugerencia) : [];
  });
  protected readonly mensajeError = computed(() => mensajeDe(this.recurso.error()));
}
