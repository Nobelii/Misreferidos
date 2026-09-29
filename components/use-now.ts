"use client";

import { useSyncExternalStore } from "react";

// Una sola lectura del reloj por carga de página: los textos que dependen de
// ella ("termina en 3 días", "usado hace 2 h") tienen resolución de horas o
// días, así que no hace falta que avance.
let clientNow: number | null = null;

const subscribe = () => () => {};
const getSnapshot = () => (clientNow ??= Date.now());
const getServerSnapshot = () => null;

/**
 * La hora actual, o null en el servidor y durante la hidratación.
 *
 * Con Cache Components, leer la hora en el render de un componente que se
 * prerenderiza — también si es de cliente — hace que Next aplace el Suspense
 * entero al navegador: el HTML estático sale con el skeleton y el contenido
 * llega por JS, invisible para un crawler sin render. Con null en el servidor
 * el resto del componente sí entra en el HTML; lo que depende de la hora se
 * pinta al hidratar.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
