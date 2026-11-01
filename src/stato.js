// Stato dell'app in memoria. Chi deve ridisegnare si iscrive con ascolta().
const ascoltatori = new Set();

export const stato = {
  pronto: false,      // sessione verificata all'avvio
  sessione: null,     // sessione Supabase, null se non c'è login
  caricamento: false, // dati in arrivo
  errore: null,       // messaggio da mostrare in alto, se i dati non arrivano
  voci: [],           // liste predefinite: categorie, colori, stagioni, occasioni
  numCapi: null,      // null finché non è noto
};

export function aggiorna(modifiche) {
  Object.assign(stato, modifiche);
  for (const f of ascoltatori) f(stato);
}

export function ascolta(f) {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

export const azzeraDati = () => aggiorna({ voci: [], numCapi: null, errore: null, caricamento: false });
