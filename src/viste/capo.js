import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { trovaCapo, outfitDiCapo, capiDiOutfit } from "../stato.js";
import { nomeVoce, nomeCapo } from "../voci.js";
import { eliminaCapo } from "../dati.js";
import { sostituisci } from "../router.js";
import { apriFoglio, chiudiFoglio, toast } from "../ui/avvisi.js";
import { barra, vuoto, foto, pallino, collage, nomeOutfit, descriviOutfit } from "./comuni.js";

export const conTabbar = true;
export const fab = () => "";

const data = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
const elenco = (lista, slugs) => slugs.length ? slugs.map((s) => nomeVoce(lista, s)).join(", ") : "—";

export function render(s, { rotta, avviso = "" }) {
  const id = rotta.param[0];
  if (s.capi == null) return html`${barra({ indietro: "Armadio", href: "#/armadio" })}${avviso}<p class="nota">Carico…</p>`;
  const c = trovaCapo(id);
  if (!c) {
    return html`${barra({ indietro: "Armadio", href: "#/armadio" })}${vuoto({
      icona: "hanger", titolo: "Capo non trovato", testo: "Forse è stato eliminato.",
      azione: html`<a class="btn" href="#/armadio">Torna all'armadio</a>`,
    })}`;
  }

  const inOutfit = outfitDiCapo(c.id);
  return html`
    ${barra({
      indietro: "Armadio",
      href: "#/armadio",
      azione: html`<a class="btn piccolo" href="#/capo/${c.id}/modifica">${icona("pencil", 16)}Modifica</a>`,
    })}
    ${avviso}
    <article class="scheda">
      ${foto(c.foto, { classe: "grande", alt: `Foto: ${nomeCapo(c)}` })}
      <h1 tabindex="-1">${nomeCapo(c)}</h1>
      <p class="sotto">${nomeVoce("categoria", c.categoria)}${c.marca ? ` · ${c.marca}` : ""}</p>
      <dl class="righe">
        <div><dt>Colore</dt><dd class="colori">
          ${[c.colore, ...c.colori_secondari].map((k) => html`<span>${pallino(k)}${nomeVoce("colore", k)}</span>`)}
        </dd></div>
        <div><dt>Stagioni</dt><dd>${elenco("stagione", c.stagioni)}</dd></div>
        <div><dt>Occasioni</dt><dd>${elenco("occasione", c.occasioni)}</dd></div>
        <div><dt>Stato</dt><dd>${nomeVoce("stato", c.stato)}</dd></div>
        ${c.note ? html`<div class="nota-capo"><dt>Note</dt><dd>${c.note}</dd></div>` : ""}
        <div><dt>Aggiunto</dt><dd>${data(c.creato_il)}</dd></div>
      </dl>
      <section class="sezione">
        <h2>Outfit</h2>
        ${inOutfit.length
          ? html`<ul class="lista-outfit">${inOutfit.map((o) => html`
              <li>
                <a class="riga-outfit" href="#/outfit/${o.id}">
                  ${collage(capiDiOutfit(o.id), "piccolo")}
                  <span><span class="riga-nome">${nomeOutfit(o, capiDiOutfit(o.id))}</span>
                  ${descriviOutfit(o) ? html`<span class="riga-meta">${descriviOutfit(o)}</span>` : ""}</span>
                  ${icona("chevron-right", 18)}
                </a>
              </li>`)}</ul>`
          : html`<p class="nota">Non compare ancora in nessun outfit.</p>`}
        ${c.stato !== "wishlist" ? html`
          <button class="btn largo" type="button" data-azione="componi-con" data-id="${c.id}">${icona("shuffle", 18)}Crea un outfit con questo capo</button>` : ""}
      </section>
      <button class="btn largo" type="button" data-azione="elimina-capo" data-id="${c.id}">${icona("trash", 18)}Elimina capo</button>
    </article>`;
}

function conferma(c) {
  const n = outfitDiCapo(c.id).length;
  const outfit = n ? (n === 1 ? " e dall'outfit in cui compare" : ` e dai ${n} outfit in cui compare`) : "";
  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa"><h2 id="foglio-titolo">Eliminare questo capo?</h2></div>
    <p class="foglio-testo">«${nomeCapo(c)}» sparisce dall'armadio${outfit}, insieme alla sua foto. Non si può annullare.</p>
    <div class="foglio-azioni">
      <button class="btn" type="button" data-azione="chiudi-foglio">Annulla</button>
      <button class="btn" type="button" data-azione="conferma-elimina" data-id="${c.id}">${icona("trash", 18)}Elimina capo</button>
    </div>`;
}

export const azioni = {
  "elimina-capo": (el) => {
    const c = trovaCapo(el.dataset.id);
    if (c) apriFoglio(conferma(c));
  },
  "conferma-elimina": async (el) => {
    const c = trovaCapo(el.dataset.id);
    if (!c) return chiudiFoglio();
    el.disabled = true;
    el.setAttribute("aria-busy", "true");
    try {
      await eliminaCapo(c);
      chiudiFoglio();
      toast("Capo eliminato.");
      sostituisci("armadio");
    } catch (e) {
      console.error("eliminazione", e);
      el.disabled = false;
      el.removeAttribute("aria-busy");
      toast("Non sono riuscito a eliminarlo. Riprova.");
    }
  },
};
