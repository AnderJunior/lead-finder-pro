/**
 * Event bus para sincronizar créditos entre componentes.
 * Sempre que uma operação consumir créditos no backend, chame `notifyCreditsChanged()`.
 * O `useSerperCredits` se inscreve e refaz o fetch.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyCreditsChanged(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn("[credits-bus]", err);
    }
  });
}

export function subscribeCreditsChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
