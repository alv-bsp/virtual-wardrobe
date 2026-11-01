// Routing a hash (#/armadio, #/outfit, #/manca): su GitHub Pages non serve nessun ripiego lato server.
export const SEZIONI = ["armadio", "outfit", "manca"];

export function rotta() {
  const [nome = "", ...param] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  return { nome: SEZIONI.includes(nome) ? nome : "armadio", param, valida: SEZIONI.includes(nome) };
}

/** Corregge un hash sconosciuto senza aggiungere una voce alla cronologia. */
export function normalizza() {
  if (!rotta().valida) history.replaceState(null, "", "#/armadio");
}
