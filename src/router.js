// Routing a hash: su GitHub Pages non serve nessun ripiego lato server.
//   #/armadio · #/outfit · #/manca          le tre sezioni della tab bar
//   #/nuovo                                 aggiunta di un capo
//   #/capo/<id> · #/capo/<id>/modifica      scheda e modifica di un capo
//   #/outfit/nuovo · #/outfit/<id> · #/outfit/<id>/modifica
export const SEZIONI = ["armadio", "outfit", "manca"];
const PAGINE = [...SEZIONI, "nuovo", "capo"];

export function rotta() {
  const [nome = "", ...param] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const valida = PAGINE.includes(nome) && (nome !== "capo" || Boolean(param[0]));
  const n = valida ? nome : "armadio";
  return { nome: n, param, valida, sezione: SEZIONI.includes(n) ? n : "armadio" };
}

/** Corregge un hash sconosciuto senza aggiungere una voce alla cronologia. */
export function normalizza() {
  if (!rotta().valida) history.replaceState(null, "", "#/armadio");
}

/** Va a una pagina sostituendo quella corrente (dopo un salvataggio, Indietro non riporta al form). */
export const sostituisci = (percorso) => location.replace(`#/${percorso}`);
export const vai = (percorso) => { location.hash = `#/${percorso}`; };
