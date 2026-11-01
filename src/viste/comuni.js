import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";

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
