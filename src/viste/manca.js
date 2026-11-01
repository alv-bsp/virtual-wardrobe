import { html } from "../ui/html.js";
import { testata, vuoto } from "./comuni.js";

export const titolo = "Cosa manca";

export function render(s, { avviso = "" } = {}) {
  let corpo = "";
  if (s.numCapi === 0) {
    corpo = vuoto({
      icona: "pie",
      titolo: "Ancora niente da contare",
      testo: "Aggiungi qualche capo e componi un paio di outfit: qui vedrai cosa manca e cosa non usi.",
      azione: html`<a class="btn" href="#/armadio">Vai all'armadio</a>`,
    });
  } else if (s.numCapi > 0) {
    corpo = html`<p class="nota">I conteggi arrivano in una prossima versione.</p>`;
  }
  return html`${testata(titolo)}${avviso}${corpo}`;
}

export const fab = () => "";
