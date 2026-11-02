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
  outfit: null,       // tutti gli outfit
  collegamenti: [],   // coppie { outfit_id, capo_id }
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
  aggiorna({ voci: [], capi: null, outfit: null, collegamenti: [], errore: null, caricamento: false, filtri: filtriVuoti() });

export const trovaCapo = (id) => stato.capi?.find((c) => c.id === id) || null;
export const trovaOutfit = (id) => stato.outfit?.find((o) => o.id === id) || null;

/** Capi di un outfit, nell'ordine degli strati se serve (vedi outfit.js). */
export const capiDiOutfit = (outfitId) => {
  const ids = new Set(stato.collegamenti.filter((l) => l.outfit_id === outfitId).map((l) => l.capo_id));
  return (stato.capi || []).filter((c) => ids.has(c.id));
};

export const outfitDiCapo = (capoId) => {
  const ids = new Set(stato.collegamenti.filter((l) => l.capo_id === capoId).map((l) => l.outfit_id));
  return (stato.outfit || []).filter((o) => ids.has(o.id));
};

/** Quante volte ogni capo compare negli outfit salvati. */
export function usiDeiCapi() {
  const usi = new Map();
  for (const l of stato.collegamenti) usi.set(l.capo_id, (usi.get(l.capo_id) || 0) + 1);
  return usi;
}
