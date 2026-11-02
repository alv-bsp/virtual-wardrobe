import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { aggiorna, capiDiOutfit } from "../stato.js";
import { voci } from "../voci.js";
import { testata, vuoto, collage, nomeOutfit, descriviOutfit } from "./comuni.js";

export const titolo = "Outfit";
export const conTabbar = true;

// Filtro dell'elenco: solo preferiti e/o una stagione.
let filtro = { preferiti: false, stagione: null };

export function render(s, { avviso = "" } = {}) {
  if (s.capi == null || s.outfit == null) return html`${testata(titolo, s.caricamento ? "Carico…" : "")}${avviso}`;
  const n = s.outfit.length;
  const sotto = n === 1 ? "1 outfit" : `${n} outfit`;

  if (!n) {
    const pochi = s.capi.filter((c) => c.stato === "armadio").length < 2;
    return html`${testata(titolo)}${avviso}${vuoto({
      icona: "layers",
      titolo: "Nessun outfit",
      testo: pochi
        ? "Aggiungi almeno un paio di capi all'armadio, poi qui li combini."
        : "Genera una proposta per stagione e occasione, cambia quello che non ti convince e salvala.",
      azione: pochi
        ? html`<a class="btn" href="#/armadio">Vai all'armadio</a>`
        : html`<button class="btn primario" type="button" data-azione="nuovo-outfit">${icona("shuffle", 20)}Genera il primo outfit</button>`,
    })}`;
  }

  const visibili = s.outfit.filter((o) =>
    (!filtro.preferiti || o.preferito) && (!filtro.stagione || !o.stagioni.length || o.stagioni.includes(filtro.stagione)));

  return html`
    ${testata(titolo, sotto)}
    ${avviso}
    <div class="chips-riga" role="group" aria-label="Filtri">
      <button class="chip" type="button" data-azione="filtro-outfit" data-valore="" aria-pressed="${!filtro.preferiti && !filtro.stagione}">
        ${!filtro.preferiti && !filtro.stagione ? icona("check", 15, 2.6) : ""}Tutti
      </button>
      <button class="chip" type="button" data-azione="filtro-outfit" data-valore="preferiti" aria-pressed="${filtro.preferiti}">
        ${icona("heart", 15, 2.2)}Preferiti
      </button>
      ${voci("stagione").map((v) => html`
        <button class="chip" type="button" data-azione="filtro-outfit" data-valore="${v.slug}" aria-pressed="${filtro.stagione === v.slug}">
          ${filtro.stagione === v.slug ? icona("check", 15, 2.6) : ""}${v.nome}
        </button>`)}
    </div>
    ${visibili.length
      ? html`<ul class="griglia-outfit">${visibili.map((o) => scheda(o, capiDiOutfit(o.id)))}</ul>`
      : vuoto({ icona: "layers", titolo: "Nessun outfit con questo filtro", testo: "Prova con un altro.",
          azione: html`<button class="btn" type="button" data-azione="filtro-outfit" data-valore="">Mostra tutti</button>` })}`;
}

function scheda(o, capi) {
  return html`
    <li>
      <a class="tessera-outfit" href="#/outfit/${o.id}">
        ${collage(capi)}
        <span class="tessera-nome">${o.preferito ? html`<span class="cuore" aria-label="Preferito">${icona("heart", 13, 2.4)}</span>` : ""}${nomeOutfit(o, capi)}</span>
        <span class="tessera-meta">${descriviOutfit(o) || `${capi.length} capi`}</span>
      </a>
    </li>`;
}

export function fab(s) {
  if (!s.outfit?.length) return "";
  return html`<button class="btn primario fab" type="button" data-azione="nuovo-outfit">${icona("shuffle", 20)}Nuovo outfit</button>`;
}

export const azioni = {
  "filtro-outfit": (el) => {
    const v = el.dataset.valore;
    if (!v) filtro = { preferiti: false, stagione: null };
    else if (v === "preferiti") filtro = { ...filtro, preferiti: !filtro.preferiti };
    else filtro = { ...filtro, stagione: filtro.stagione === v ? null : v };
    aggiorna({});
  },
};
