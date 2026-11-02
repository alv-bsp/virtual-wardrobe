import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { trovaOutfit, capiDiOutfit } from "../stato.js";
import { nomeCapo } from "../voci.js";
import { SLOT, slotDi } from "../outfit.js";
import { eliminaOutfit, impostaPreferito } from "../dati.js";
import { sostituisci } from "../router.js";
import { apriFoglio, chiudiFoglio, toast } from "../ui/avvisi.js";
import { barra, vuoto, foto, inOrdine, nomeOutfit, descriviOutfit } from "./comuni.js";

export const titolo = "Outfit";
export const conTabbar = true;
export const fab = () => "";

const nomeSlot = (c) => SLOT.find((s) => s.id === slotDi(c))?.nome || "";

export function render(s, { rotta, avviso = "" }) {
  const id = rotta.param[0];
  if (s.capi == null || s.outfit == null) return html`${barra({ indietro: "Outfit", href: "#/outfit" })}${avviso}<p class="nota">Carico…</p>`;
  const o = trovaOutfit(id);
  if (!o) {
    return html`${barra({ indietro: "Outfit", href: "#/outfit" })}${vuoto({
      icona: "layers", titolo: "Outfit non trovato", testo: "Forse è stato eliminato.",
      azione: html`<a class="btn" href="#/outfit">Torna agli outfit</a>`,
    })}`;
  }
  const capi = inOrdine(capiDiOutfit(o.id));

  return html`
    ${barra({
      indietro: "Outfit",
      href: "#/outfit",
      azione: html`<a class="btn piccolo" href="#/outfit/${o.id}/modifica">${icona("pencil", 16)}Modifica</a>`,
    })}
    ${avviso}
    <article class="scheda">
      <ul class="griglia-capi-outfit">
        ${capi.map((c) => html`
          <li>
            <a class="tessera" href="#/capo/${c.id}">
              ${foto(c.miniatura)}
              <span class="tessera-meta">${nomeSlot(c)}</span>
              <span class="tessera-nome">${nomeCapo(c)}</span>
            </a>
          </li>`)}
      </ul>
      ${!capi.length ? html`<p class="nota">I capi di questo outfit sono stati eliminati.</p>` : ""}
      <h1 tabindex="-1">${nomeOutfit(o, capi)}</h1>
      ${descriviOutfit(o) ? html`<p class="sotto">${descriviOutfit(o)}</p>` : ""}
      <div class="azioni-riga">
        <button class="chip" type="button" data-azione="preferito" data-id="${o.id}" aria-pressed="${o.preferito}">
          ${icona("heart", 17, 2)}${o.preferito ? "Tra i preferiti" : "Aggiungi ai preferiti"}
        </button>
      </div>
      ${o.note ? html`<p class="note-outfit">${o.note}</p>` : ""}
      <button class="btn largo" type="button" data-azione="elimina-outfit" data-id="${o.id}">${icona("trash", 18)}Elimina outfit</button>
    </article>`;
}

function conferma(o) {
  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa"><h2 id="foglio-titolo">Eliminare questo outfit?</h2></div>
    <p class="foglio-testo">«${nomeOutfit(o, capiDiOutfit(o.id))}» sparisce dagli outfit. I capi restano nell'armadio.</p>
    <div class="foglio-azioni">
      <button class="btn" type="button" data-azione="chiudi-foglio">Annulla</button>
      <button class="btn" type="button" data-azione="conferma-elimina-outfit" data-id="${o.id}">${icona("trash", 18)}Elimina outfit</button>
    </div>`;
}

export const azioni = {
  preferito: async (el) => {
    const o = trovaOutfit(el.dataset.id);
    if (!o) return;
    el.disabled = true;
    try {
      await impostaPreferito(o, !o.preferito);
    } catch (e) {
      console.error("preferito", e);
      el.disabled = false;
      toast("Non sono riuscito a salvarlo. Riprova.");
    }
  },
  "elimina-outfit": (el) => {
    const o = trovaOutfit(el.dataset.id);
    if (o) apriFoglio(conferma(o));
  },
  "conferma-elimina-outfit": async (el) => {
    const o = trovaOutfit(el.dataset.id);
    if (!o) return chiudiFoglio();
    el.disabled = true;
    try {
      await eliminaOutfit(o);
      chiudiFoglio();
      toast("Outfit eliminato.");
      sostituisci("outfit");
    } catch (e) {
      console.error("eliminazione outfit", e);
      el.disabled = false;
      toast("Non sono riuscito a eliminarlo. Riprova.");
    }
  },
};
