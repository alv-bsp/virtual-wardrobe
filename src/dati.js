import { sb } from "./supabase.js";
import { stato, aggiorna } from "./stato.js";
import { caricaFoto, rimuoviFoto } from "./foto.js";

const CAMPI_CAPO = "id, nome, categoria, colore, colori_secondari, stagioni, occasioni, marca, stato, note, foto, miniatura, creato_il, modificato_il";

/**
 * Carica tutto quello che serve dopo il login: liste e capi.
 * Con qualche centinaio di capi sta tutto in memoria; filtri e ricerca girano nel browser.
 */
export async function caricaTutto() {
  aggiorna({ caricamento: true, errore: null });
  const [voci, capi] = await Promise.all([
    sb.from("voci").select("lista, slug, nome, ordine, hex, attiva").order("lista").order("ordine"),
    sb.from("capi").select(CAMPI_CAPO).order("creato_il", { ascending: false }),
  ]);
  if (voci.error) console.error("voci", voci.error);
  if (capi.error) console.error("capi", capi.error);

  let errore = null;
  if (voci.error || capi.error) {
    errore = senzaRete(voci.error || capi.error)
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
  });
}

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
  aggiorna({ capi: stato.capi.filter((c) => c.id !== capo.id) });
  rimuoviFoto([capo.foto, capo.miniatura]);
}

const senzaRete = (e) => !navigator.onLine || /fetch|network/i.test(e?.message || "");
