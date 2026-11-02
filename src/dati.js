import { sb } from "./supabase.js";
import { stato, aggiorna } from "./stato.js";
import { caricaFoto, rimuoviFoto } from "./foto.js";

const CAMPI_CAPO = "id, nome, categoria, colore, colori_secondari, stagioni, occasioni, marca, stato, note, foto, miniatura, creato_il, modificato_il";
const CAMPI_OUTFIT = "id, nome, stagioni, occasioni, note, preferito, creato_il, modificato_il";

/**
 * Carica tutto quello che serve dopo il login: liste, capi, outfit e collegamenti.
 * Con qualche centinaio di righe sta tutto in memoria; filtri, ricerca e conteggi girano nel browser.
 */
export async function caricaTutto() {
  aggiorna({ caricamento: true, errore: null });
  const [voci, capi, outfit, collegamenti] = await Promise.all([
    sb.from("voci").select("lista, slug, nome, ordine, hex, attiva").order("lista").order("ordine"),
    sb.from("capi").select(CAMPI_CAPO).order("creato_il", { ascending: false }),
    sb.from("outfit").select(CAMPI_OUTFIT).order("creato_il", { ascending: false }),
    sb.from("outfit_capi").select("outfit_id, capo_id"),
  ]);
  const primoErrore = [voci, capi, outfit, collegamenti].find((r) => r.error)?.error;
  if (primoErrore) console.error("caricamento", primoErrore);

  let errore = null;
  if (primoErrore) {
    errore = senzaRete(primoErrore)
      ? "Nessuna connessione: non riesco a caricare i dati."
      : "Non riesco a leggere i dati. Hai eseguito supabase/schema.sql nel progetto Supabase?";
  } else if (!voci.data.length) {
    errore = "Le liste sono vuote: esegui supabase/voci.sql nel SQL Editor di Supabase.";
  }

  aggiorna({
    caricamento: false,
    errore,
    voci: voci.data || stato.voci,
    capi: capi.error ? stato.capi : capi.data,
    outfit: outfit.error ? stato.outfit : outfit.data,
    collegamenti: collegamenti.error ? stato.collegamenti : collegamenti.data,
  });
}

// ───────────────────────────── capi

/**
 * Salva un capo nuovo o modificato. Se c'è una foto nuova la carica prima, e cancella la vecchia solo
 * dopo che il salvataggio è andato a buon fine. Restituisce il capo salvato.
 */
export async function salvaCapo(bozza) {
  const userId = stato.sessione.user.id;
  const nuovo = !bozza.id;
  const id = bozza.id || crypto.randomUUID();
  const precedente = nuovo ? null : stato.capi.find((c) => c.id === id);

  let percorsi = { foto: precedente?.foto ?? null, miniatura: precedente?.miniatura ?? null };
  const fotoNuova = Boolean(bozza.foto?.grande);
  if (fotoNuova) percorsi = await caricaFoto(userId, id, bozza.foto);
  else if (bozza.fotoRimossa) percorsi = { foto: null, miniatura: null };

  const riga = {
    nome: bozza.nome.trim() || null,
    categoria: bozza.categoria,
    colore: bozza.colore,
    colori_secondari: bozza.colori_secondari.filter((c) => c !== bozza.colore),
    stagioni: bozza.stagioni,
    occasioni: bozza.occasioni,
    marca: bozza.marca.trim() || null,
    stato: bozza.stato,
    note: bozza.note.trim() || null,
    ...percorsi,
  };

  const q = nuovo
    ? sb.from("capi").insert({ id, ...riga }).select(CAMPI_CAPO).single()
    : sb.from("capi").update(riga).eq("id", id).select(CAMPI_CAPO).single();
  const { data, error } = await q;
  if (error) {
    if (fotoNuova) await rimuoviFoto([percorsi.foto, percorsi.miniatura]);
    throw error;
  }

  if (precedente && (fotoNuova || bozza.fotoRimossa)) rimuoviFoto([precedente.foto, precedente.miniatura]);
  const capi = nuovo ? [data, ...stato.capi] : stato.capi.map((c) => (c.id === id ? data : c));
  aggiorna({ capi });
  return data;
}

/** Elimina il capo (e con lui i suoi collegamenti agli outfit), poi le sue foto. */
export async function eliminaCapo(capo) {
  const { error } = await sb.from("capi").delete().eq("id", capo.id);
  if (error) throw error;
  aggiorna({
    capi: stato.capi.filter((c) => c.id !== capo.id),
    collegamenti: stato.collegamenti.filter((l) => l.capo_id !== capo.id),
  });
  rimuoviFoto([capo.foto, capo.miniatura]);
}

// ───────────────────────────── outfit

/**
 * Salva un outfit nuovo o modificato con i suoi capi. Prima la riga dell'outfit, poi i collegamenti:
 * aggiunge quelli nuovi e toglie quelli che non ci sono più. Restituisce l'outfit salvato.
 */
export async function salvaOutfit({ id, nome, stagioni, occasioni, note, preferito, capi }) {
  const nuovo = !id;
  const riga = { nome: nome.trim() || null, stagioni, occasioni, note: note.trim() || null, preferito };
  const { data, error } = nuovo
    ? await sb.from("outfit").insert(riga).select(CAMPI_OUTFIT).single()
    : await sb.from("outfit").update(riga).eq("id", id).select(CAMPI_OUTFIT).single();
  if (error) throw error;

  const prima = new Set(stato.collegamenti.filter((l) => l.outfit_id === data.id).map((l) => l.capo_id));
  const dopo = new Set(capi);
  const daAggiungere = [...dopo].filter((c) => !prima.has(c));
  const daTogliere = [...prima].filter((c) => !dopo.has(c));

  if (daAggiungere.length) {
    const { error: e } = await sb.from("outfit_capi").insert(daAggiungere.map((capo_id) => ({ outfit_id: data.id, capo_id })));
    if (e) {
      if (nuovo) await sb.from("outfit").delete().eq("id", data.id); // niente outfit vuoti a metà
      throw e;
    }
  }
  if (daTogliere.length) {
    const { error: e } = await sb.from("outfit_capi").delete().eq("outfit_id", data.id).in("capo_id", daTogliere);
    if (e) throw e;
  }

  aggiorna({
    outfit: nuovo ? [data, ...stato.outfit] : stato.outfit.map((o) => (o.id === data.id ? data : o)),
    collegamenti: [
      ...stato.collegamenti.filter((l) => l.outfit_id !== data.id),
      ...[...dopo].map((capo_id) => ({ outfit_id: data.id, capo_id })),
    ],
  });
  return data;
}

export async function impostaPreferito(outfit, preferito) {
  const { data, error } = await sb.from("outfit").update({ preferito }).eq("id", outfit.id).select(CAMPI_OUTFIT).single();
  if (error) throw error;
  aggiorna({ outfit: stato.outfit.map((o) => (o.id === data.id ? data : o)) });
}

export async function eliminaOutfit(outfit) {
  const { error } = await sb.from("outfit").delete().eq("id", outfit.id);
  if (error) throw error;
  aggiorna({
    outfit: stato.outfit.filter((o) => o.id !== outfit.id),
    collegamenti: stato.collegamenti.filter((l) => l.outfit_id !== outfit.id),
  });
}

const senzaRete = (e) => !navigator.onLine || /fetch|network/i.test(e?.message || "");
