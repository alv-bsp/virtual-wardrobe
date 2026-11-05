import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { hexColore, nomeVoce, nomeCapo } from "../voci.js";
import { urlInCache } from "../foto.js";
import { SLOT, slotDi } from "../outfit.js";

/** Titolo della sezione con il pulsante Account a destra. */
export function testata(titolo, sotto = "") {
  return html`
    <header class="testata">
      <div>
        <h1 tabindex="-1">${titolo}</h1>
        ${sotto ? html`<p class="sotto">${sotto}</p>` : ""}
      </div>
      <button class="icona-btn" type="button" data-azione="account" aria-label="Account">${icona("user")}</button>
    </header>`;
}

/** Barra delle pagine interne: cerchio per uscire a sinistra (× se annulla, ← se torna), titolo, azione. */
export function barra({ indietro, href, azione = "", titolo = "" }) {
  return html`
    <header class="barra">
      <a class="icona-btn indietro" href="${href}" aria-label="${indietro}">${icona(indietro === "Annulla" ? "x" : "arrow-left", 20)}</a>
      ${titolo ? html`<h1 class="barra-titolo" tabindex="-1">${titolo}</h1>` : html`<span aria-hidden="true"></span>`}
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

/** Foto del capo: l'indirizzo firmato arriva dopo (idrataFoto), se non è già in memoria. */
export function foto(percorso, { classe = "", alt = "" } = {}) {
  if (!percorso) return html`<div class="foto senza ${classe}">${icona("hanger", 30, 1.5)}</div>`;
  const src = urlInCache(percorso);
  return html`<div class="foto ${classe}"><img data-foto="${percorso}" ${src ? html`src="${src}"` : ""} alt="${alt}" decoding="async"></div>`;
}

export const etichettaStato = (s) => (s === "armadio" ? "" : nomeVoce("stato", s));

// ───────────────────────────── outfit
const PRIORITA_COLLAGE = ["sotto", "scarpe", "giacca", "accessori"];

/** Capi dell'outfit in ordine di strato, dall'alto in basso. */
export function inOrdine(capi) {
  const pos = (c) => SLOT.findIndex((s) => s.id === slotDi(c));
  return [...capi].sort((a, b) => pos(a) - pos(b));
}

/** Fino a quattro miniature: un capo sopra (maglia o sopra), sotto, scarpe, poi giacca e il resto. */
export function collage(capi, classe = "") {
  const perSlot = (id) => capi.filter((c) => slotDi(c) === id);
  const sopra = [...perSlot("maglia"), ...perSlot("sopra")];
  const ordinati = [sopra[0], ...PRIORITA_COLLAGE.flatMap(perSlot), ...sopra.slice(1)].filter(Boolean);
  const quattro = ordinati.slice(0, 4);
  return html`
    <div class="collage ${classe}" aria-hidden="true">
      ${[0, 1, 2, 3].map((i) => (quattro[i] ? foto(quattro[i].miniatura) : html`<div class="foto vuoto-collage"></div>`))}
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
