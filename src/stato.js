import { filtriVuoti } from "./filtri.js";

// Stato dell'app in memoria. Chi deve ridisegnare si iscrive con ascolta().
const ascoltatori = new Set();

export const stato = {
  pronto: false,      // sessione verificata all'avvio
  sessione: null,     // sessione Supabase, null se non c'è login
  caricamento: false, // dati in arrivo
  errore: null,       // messaggio da mostrare in alto, se i dati non arrivano
  voci: [],           // liste predefinite: categorie, colori, stagioni, occasioni
  capi: null,         // tutti i capi dell'utente, null finché non arrivano
  filtri: filtriVuoti(),
};

export function aggiorna(modifiche) {
  Object.assign(stato, modifiche);
  for (const f of ascoltatori) f(stato);
}

export function ascolta(f) {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

export const azzeraDati = () =>
  aggiorna({ voci: [], capi: null, errore: null, caricamento: false, filtri: filtriVuoti() });

export const trovaCapo = (id) => stato.capi?.find((c) => c.id === id) || null;
