import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListaActividades } from './actividades/lista-actividades/lista-actividades';
import { ResumenActividades } from './actividades/resumen-actividades/resumen-actividades';
import { TarjetaActividad } from './actividades/tarjeta-actividad/tarjeta-actividad';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ResumenActividades, TarjetaActividad, ListaActividades],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
