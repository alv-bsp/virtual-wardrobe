import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { aggiorna, stato } from "../stato.js";
import { filtra, alterna, filtriVuoti } from "../filtri.js";
import { voci, STATI } from "../voci.js";
import { apriFoglio, chiudiFoglio } from "../ui/avvisi.js";
import { pallino } from "./comuni.js";

// Foglio dal basso con i filtri meno usati. La categoria resta nei chip sopra la griglia.
export function render(s) {
  const f = s.filtri;
  const n = filtra(s.capi || [], f).length;
  const gruppo = (titolo, chiave, elenco, conPallino = false) => html`
    <fieldset class="gruppo">
      <legend>${titolo}</legend>
      <div class="chips">
        ${elenco.map((v) => {
          const on = f[chiave].includes(v.slug);
          return html`
            <button class="chip" type="button" data-azione="filtro" data-gruppo="${chiave}" data-valore="${v.slug}" aria-pressed="${on}">
              ${on ? icona("check", 15, 2.6) : ""}${conPallino ? pallino(v.slug) : ""}${v.nome}
            </button>`;
        })}
      </div>
    </fieldset>`;

  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa">
      <h2 id="foglio-titolo">Filtri</h2>
      <button class="icona-btn" type="button" data-azione="chiudi-foglio" aria-label="Chiudi">${icona("x")}</button>
    </div>
    ${gruppo("Colore", "colori", voci("colore"), true)}
    ${gruppo("Stagione", "stagioni", voci("stagione"))}
    ${gruppo("Occasione", "occasioni", voci("occasione"))}
    ${gruppo("Stato", "stati", STATI)}
    <div class="foglio-azioni">
      <button class="btn" type="button" data-azione="azzera-filtri-foglio">Azzera</button>
      <button class="btn primario" type="button" data-azione="chiudi-foglio">${n === 1 ? "Mostra 1 capo" : `Mostra ${n} capi`}</button>
    </div>`;
}

export const azioni = {
  filtro: (el) => {
    const chiave = el.dataset.gruppo;
    aggiorna({ filtri: { ...stato.filtri, [chiave]: alterna(stato.filtri[chiave], el.dataset.valore) } });
    apriFoglio(render(stato));
  },
  "azzera-filtri-foglio": () => {
    aggiorna({ filtri: { ...filtriVuoti(), categoria: stato.filtri.categoria, testo: stato.filtri.testo } });
    apriFoglio(render(stato));
  },
  "chiudi-filtri": chiudiFoglio,
};
