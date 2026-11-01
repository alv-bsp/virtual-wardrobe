import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { testata, vuoto } from "./comuni.js";

export const titolo = "Outfit";
export const conTabbar = true;

export function render(s, { avviso = "" } = {}) {
  let corpo = "";
  const n = s.capi?.length;
  if (n === 0) {
    corpo = vuoto({
      icona: "layers",
      titolo: "Nessun outfit",
      testo: "Prima aggiungi qualche capo all'armadio, poi qui li combini.",
      azione: html`<a class="btn" href="#/armadio">Vai all'armadio</a>`,
    });
  } else if (n > 0) {
    corpo = vuoto({
      icona: "layers",
      titolo: "Nessun outfit",
      testo: "Scegli un capo per categoria e salva la combinazione.",
      azione: html`<button class="btn primario" type="button" data-azione="nuovo-outfit">${icona("plus")}Componi il primo outfit</button>`,
    });
  }
  return html`${testata(titolo)}${avviso}${corpo}`;
}

export const fab = () => "";
