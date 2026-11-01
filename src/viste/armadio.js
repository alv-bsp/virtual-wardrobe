import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { testata, vuoto, contaCapi } from "./comuni.js";

export const titolo = "Armadio";

export function render(s, { avviso = "" } = {}) {
  const sotto = s.caricamento && s.numCapi == null ? "Carico…" : contaCapi(s.numCapi);
  let corpo = "";
  if (s.numCapi === 0) {
    corpo = vuoto({
      icona: "hanger",
      titolo: "Il tuo armadio è vuoto",
      testo: "Fotografa un capo e scegli categoria e colore: bastano pochi secondi.",
      azione: html`<button class="btn primario" type="button" data-azione="aggiungi-capo">${icona("plus")}Aggiungi il primo capo</button>`,
    });
  } else if (s.numCapi > 0) {
    corpo = html`<p class="nota">La griglia dei capi arriva nella prossima versione.</p>`;
  }
  return html`${testata(titolo, sotto)}${avviso}${corpo}`;
}

// L'azione principale galleggia solo quando c'è già qualcosa: con l'armadio vuoto la porta lo stato vuoto.
export function fab(s) {
  if (!(s.numCapi > 0)) return "";
  return html`<button class="btn primario fab" type="button" data-azione="aggiungi-capo">${icona("plus")}Aggiungi capo</button>`;
}
