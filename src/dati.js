import { sb } from "./supabase.js";
import { aggiorna } from "./stato.js";

/**
 * Carica quello che serve dopo il login. Per ora: le liste e il numero di capi.
 * Se qualcosa non torna, il messaggio dice quale passo di configurazione controllare.
 */
export async function caricaTutto() {
  aggiorna({ caricamento: true, errore: null });
  const [voci, capi] = await Promise.all([
    sb.from("voci").select("lista, slug, nome, ordine, hex, attiva").order("lista").order("ordine"),
    sb.from("capi").select("id", { count: "exact", head: true }),
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
    voci: voci.data || [],
    numCapi: capi.error ? null : capi.count ?? null,
  });
}

const senzaRete = (e) => !navigator.onLine || /fetch|network/i.test(e?.message || "");
