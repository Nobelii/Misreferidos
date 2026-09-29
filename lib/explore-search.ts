/**
 * Evento con el que el buscador del navbar le pasa la búsqueda a Explorar
 * cuando ya está abierta, sin navegar. Vive aparte para que el navbar no
 * arrastre ExploreClient a su bundle solo por importar un string.
 */
export const EXPLORE_SEARCH_EVENT = "explore:search";
