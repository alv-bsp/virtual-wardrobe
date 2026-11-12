import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { hexColore, nomeVoce, nomeCapo } from "../voci.js";
import { urlInCache } from "../foto.js";
import { fotoArrivate } from "../ui/tocco.js";
import { SLOT, slotDi } from "../outfit.js";
import { disponi } from "../disposizione.js";

/** Titolo della sezione con le impostazioni a destra. */
export function testata(titolo, sotto = "") {
  return html`
    <header class="testata">
      <div>
        <h1>${titolo}</h1>
        ${sotto ? html`<p class="sotto">${sotto}</p>` : ""}
      </div>
      <button class="icona-btn" type="button" data-azione="account" aria-label="Impostazioni">${icona("settings", 21, 1.9)}</button>
    </header>`;
}

/** Barra delle pagine interne: cerchio per uscire a sinistra (× se annulla, ← se torna), titolo, azione. */
export function barra({ indietro, href, azione = "", titolo = "" }) {
  return html`
    <header class="barra">
      <a class="icona-btn indietro" href="${href}" aria-label="${indietro}">${icona(indietro === "Annulla" ? "x" : "arrow-left", 20)}</a>
      ${titolo ? html`<h1 class="barra-titolo">${titolo}</h1>` : html`<span aria-hidden="true"></span>`}
      <div class="barra-azione">${azione}</div>
    </header>`;
}

/** Stato vuoto: dice cosa fare, con al massimo un'azione. */
export function vuoto({ icona: ic, titolo, testo, azione }) {
  return html`
    <section class="vuoto">
      <div class="vuoto-icona">${icona(ic, 30, 1.75)}</div>
      <h2>${titolo}</h2>
      <p>${testo}</p>
      ${azione || ""}
    </section>`;
}

export function avviso(testo) {
  return html`
    <div class="avviso" role="alert">
      ${icona("alert", 18)}
      <span>${testo}</span>
      <button class="link" type="button" data-azione="riprova">Riprova</button>
    </div>`;
}

export const contaCapi = (n) => (n == null ? "" : n === 1 ? "1 capo" : `${n} capi`);

/** Pallino del colore; "fantasia" e i colori senza esadecimale hanno un disegno a spicchi. */
export function pallino(slug) {
  const hex = hexColore(slug);
  return hex
    ? html`<span class="pallino" style="background:${hex}" aria-hidden="true"></span>`
    : html`<span class="pallino fantasia" aria-hidden="true"></span>`;
}

/**
 * Foto del capo: l'indirizzo firmato arriva dopo (idrataFoto), se non è già in memoria.
 * La prima volta la foto entra in dissolvenza; se è già arrivata prima (cambiando sezione) compare subito,
 * altrimenti ogni ritorno ad Armadio o Outfit farebbe lampeggiare tutte le foto.
 */
export function foto(percorso, { classe = "", alt = "" } = {}) {
  if (!percorso) return html`<div class="foto senza ${classe}">${icona("hanger", 30, 1.5)}</div>`;
  const src = urlInCache(percorso);
  const giaArrivata = src && fotoArrivate.has(src);
  return html`<div class="foto ${classe}"><img data-foto="${percorso}" ${src ? html`src="${src}"` : ""} alt="${alt}"
    ${giaArrivata ? html`data-js-caricata decoding="sync"` : html`decoding="async"`}></div>`;
}

export const etichettaStato = (s) => (s === "armadio" ? "" : nomeVoce("stato", s));

// ───────────────────────────── outfit

/** Capi dell'outfit in ordine di strato, dall'alto in basso. */
export function inOrdine(capi) {
  const pos = (c) => SLOT.findIndex((s) => s.id === slotDi(c));
  return [...capi].sort((a, b) => pos(a) - pos(b));
}

/**
 * L'outfit come sul tavolo: capi in foto-adesivo su un piano a puntini, con la stessa disposizione del tavolo.
 * Tutto in CSS (container query): il piano può essere grande come la scheda o piccolo come una riga.
 * Con link, ogni carta apre il suo capo.
 */
export function flatLay(capi, { classe = "", link = false } = {}) {
  return html`
    <div class="flatlay ${classe}" ${link ? "" : html`aria-hidden="true"`}>
      ${disponi(capi).map(({ capo: c, strato, posa: p }, i) => {
        const stile = `--x:${p.x.toFixed(3)};--y:${p.y.toFixed(3)};--w:${p.w};--r:${p.r.toFixed(1)}deg;--i:${i};z-index:${p.z}`;
        return link
          ? html`<a class="flatlay-carta" data-slot="${strato}" style="${stile}" href="#/capo/${c.id}" aria-label="${nomeCapo(c)}">${foto(c.miniatura)}</a>`
          : html`<div class="flatlay-carta" data-slot="${strato}" style="${stile}">${foto(c.miniatura)}</div>`;
      })}
    </div>`;
}

/** Nome dell'outfit, o i nomi dei primi due capi se non ne ha uno. */
export function nomeOutfit(o, capi) {
  if (o.nome?.trim()) return o.nome.trim();
  const ordinati = inOrdine(capi);
  return ordinati.length ? ordinati.slice(0, 2).map(nomeCapo).join(" + ") : "Outfit senza capi";
}

export function descriviOutfit(o) {
  const parti = [o.stagioni.map((s) => nomeVoce("stagione", s)).join(", "), o.occasioni.map((s) => nomeVoce("occasione", s)).join(", ")];
  return parti.filter(Boolean).join(" · ");
}
