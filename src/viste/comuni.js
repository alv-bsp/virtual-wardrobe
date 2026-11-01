import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { hexColore, nomeVoce } from "../voci.js";
import { urlInCache } from "../foto.js";

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

/** Barra delle pagine interne: indietro a sinistra, un'azione a destra. */
export function barra({ indietro, href, azione = "", titolo = "" }) {
  return html`
    <header class="barra">
      <a class="indietro" href="${href}">${icona("chevron-left", 22)}<span>${indietro}</span></a>
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
