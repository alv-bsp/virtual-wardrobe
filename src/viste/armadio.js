import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { aggiorna, stato } from "../stato.js";
import { filtra, contaAttivi, filtriVuoti, STATI_BASE } from "../filtri.js";
import { voci, nomeCapo } from "../voci.js";
import { apriFoglio } from "../ui/avvisi.js";
import { testata, vuoto, contaCapi, foto, etichettaStato } from "./comuni.js";
import * as foglioFiltri from "./filtri.js";

export const titolo = "Armadio";
export const conTabbar = true;

export function render(s, { avviso = "" } = {}) {
  if (s.capi == null) return html`${testata(titolo, s.caricamento ? "Carico…" : "")}${avviso}`;

  const f = s.filtri;
  const posseduti = s.capi.filter((c) => STATI_BASE.includes(c.stato));
  const visibili = filtra(s.capi, f);
  const attivi = contaAttivi(f) + (f.categoria ? 1 : 0) + (f.testo.trim() ? 1 : 0);
  const sotto = attivi ? `${visibili.length} di ${contaCapi(posseduti.length)}` : contaCapi(posseduti.length);

  if (!s.capi.length) {
    return html`${testata(titolo, sotto)}${avviso}${vuoto({
      icona: "hanger",
      titolo: "Il tuo armadio è vuoto",
      testo: "Fotografa un capo e scegli categoria e colore: bastano pochi secondi.",
      azione: html`<button class="btn primario" type="button" data-azione="aggiungi-capo">${icona("plus")}Aggiungi il primo capo</button>`,
    })}`;
  }

  return html`
    ${testata(titolo, sotto)}
    ${avviso}
    <label class="cerca">
      ${icona("search", 20)}
      <span class="sr">Cerca</span>
      <input id="cerca" type="search" data-input="cerca" value="${f.testo}" placeholder="Cerca per nome o marca"
        autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
    </label>
    ${rigaChip(s)}
    ${visibili.length ? griglia(visibili) : nessunRisultato(s)}`;
}

function rigaChip(s) {
  const f = s.filtri;
  const n = contaAttivi(f);
  const presenti = new Set(s.capi.map((c) => c.categoria));
  const categorie = voci("categoria", { scelte: f.categoria ? [f.categoria] : [] })
    .filter((v) => presenti.has(v.slug) || v.slug === f.categoria);
  return html`
    <div class="chips-riga" role="group" aria-label="Filtri">
      <button class="chip" type="button" data-azione="apri-filtri" aria-haspopup="dialog">
        ${icona("sliders", 17)}Filtri${n ? html`<span class="conteggio" data-key="n${n}" aria-label="${n} attivi">${n}</span>` : ""}
      </button>
      <button class="chip" type="button" data-azione="categoria" data-valore="" aria-pressed="${!f.categoria}">
        ${!f.categoria ? icona("check", 15, 2.6) : ""}Tutti
      </button>
      ${categorie.map((v) => html`
        <button class="chip" type="button" data-azione="categoria" data-valore="${v.slug}" aria-pressed="${f.categoria === v.slug}">
          ${f.categoria === v.slug ? icona("check", 15, 2.6) : ""}${v.nome}
        </button>`)}
    </div>`;
}

function griglia(capi) {
  return html`
    <ul class="griglia">
      ${capi.map((c, i) => html`
        <li data-key="${c.id}" style="--n:${Math.min(i, 12)}">
          <a class="tessera" href="#/capo/${c.id}">
            ${foto(c.miniatura)}
            ${etichettaStato(c.stato) ? html`<span class="etichetta-stato">${etichettaStato(c.stato)}</span>` : ""}
            <span class="tessera-nome">${nomeCapo(c)}</span>
          </a>
        </li>`)}
    </ul>`;
}

function nessunRisultato(s) {
  const soloWishlist = !s.capi.some((c) => STATI_BASE.includes(c.stato));
  if (soloWishlist && !contaAttivi(s.filtri) && !s.filtri.categoria && !s.filtri.testo) {
    return vuoto({
      icona: "hanger",
      titolo: "Nell'armadio non c'è ancora niente",
      testo: "Hai solo capi in wishlist.",
      azione: html`<button class="btn" type="button" data-azione="vedi-wishlist">Vedi la wishlist</button>`,
    });
  }
  return vuoto({
    icona: "search",
    titolo: "Nessun capo con questi filtri",
    testo: "Prova a toglierne qualcuno.",
    azione: html`<button class="btn" type="button" data-azione="azzera-filtri">Azzera filtri</button>`,
  });
}

// L'azione principale galleggia solo quando c'è già qualcosa: con l'armadio vuoto la porta lo stato vuoto.
export function fab(s) {
  if (!s.capi?.length) return "";
  return html`<button class="btn primario fab" type="button" data-key="fab" data-azione="aggiungi-capo">${icona("plus")}Aggiungi capo</button>`;
}

const cambiaFiltri = (modifiche) => aggiorna({ filtri: { ...stato.filtri, ...modifiche } });

export const azioni = {
  categoria: (el) => cambiaFiltri({ categoria: el.dataset.valore || null }),
  "apri-filtri": () => apriFoglio(foglioFiltri.render(stato)),
  "azzera-filtri": () => aggiorna({ filtri: filtriVuoti() }),
  "vedi-wishlist": () => cambiaFiltri({ stati: ["wishlist"] }),
};

export const input = {
  cerca: (el) => cambiaFiltri({ testo: el.value }),
};
