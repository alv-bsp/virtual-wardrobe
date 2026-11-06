import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { aggiorna, stato, trovaOutfit, trovaCapo, capiDiOutfit, usiDeiCapi } from "../stato.js";
import { voci, nomeCapo, nomeVoce } from "../voci.js";
import { alterna } from "../filtri.js";
import { SLOT, slotDi, genera, idoneo, chiaveCapi, stagioneCorrente, slotDaCapi } from "../outfit.js";
import { salvaOutfit } from "../dati.js";
import { sostituisci } from "../router.js";
import { apriFoglio, chiudiFoglio, toast } from "../ui/avvisi.js";
import { barra, vuoto, foto, nomeOutfit } from "./comuni.js";

export const conTabbar = false;

// La bozza dell'outfit vive qui finché non la salvi o esci.
let bozza = null;

const slotVuoti = () => Object.fromEntries(SLOT.map((s) => [s.id, null]));
const capiDellaBozza = (b) => [...Object.values(b.slot), ...b.extra].filter(Boolean);

function nuova({ ritorno = "#/outfit" } = {}) {
  return {
    id: null,
    slot: slotVuoti(),
    extra: [],
    bloccati: new Set(),
    stagioni: [stagioneCorrente()],
    occasioni: [],
    nome: "",
    note: "",
    preferito: false,
    viste: new Set(),
    daGenerare: true,
    salvataggio: false,
    ritorno,
  };
}

function daOutfit(o) {
  const { slot, extra } = slotDaCapi(capiDiOutfit(o.id));
  return {
    ...nuova({ ritorno: `#/outfit/${o.id}` }),
    id: o.id,
    slot,
    extra,
    bloccati: new Set(Object.keys(slot).filter((k) => slot[k])), // in modifica Genera cambia solo gli slot vuoti o sbloccati
    stagioni: [...o.stagioni],
    occasioni: [...o.occasioni],
    nome: o.nome || "",
    note: o.note || "",
    preferito: o.preferito,
    daGenerare: false,
  };
}

/** Outfit nuovo, generato subito. */
export function nuovoOutfit() {
  bozza = nuova();
}

/** Outfit nuovo attorno a un capo: il capo resta bloccato, il resto si genera. */
export function componiCon(capoId) {
  const c = trovaCapo(capoId);
  bozza = nuova({ ritorno: `#/capo/${capoId}` });
  if (!c) return;
  const id = slotDi(c);
  bozza.slot[id] = c.id;
  bozza.bloccati.add(id);
  if (c.stagioni.length) bozza.stagioni = c.stagioni.includes(stagioneCorrente()) ? [stagioneCorrente()] : [c.stagioni[0]];
}

export function abbandona() {
  bozza = null;
}

function chiaviSalvate(esclusoId) {
  return new Set((stato.outfit || []).filter((o) => o.id !== esclusoId).map((o) => chiaveCapi(capiDiOutfit(o.id).map((c) => c.id))));
}

function generaOra({ avvisa = true } = {}) {
  const b = bozza;
  if (!stato.capi?.length) {
    if (avvisa) toast("Aggiungi qualche capo all'armadio per generare outfit.");
    return;
  }
  const salvate = chiaviSalvate(b.id);
  const prima = chiaveCapi(capiDellaBozza(b));
  b.slot = genera({
    slot: b.slot,
    bloccati: b.bloccati,
    stagioni: b.stagioni,
    occasioni: b.occasioni,
    capi: stato.capi,
    usi: usiDeiCapi(),
    daEvitare: new Set([...b.viste, ...salvate]),
  });
  const chiave = chiaveCapi(capiDellaBozza(b));
  b.viste.add(chiave);
  const tuttoBloccato = SLOT.filter((s) => s.id !== "accessori").every((s) => b.bloccati.has(s.id) || !b.slot[s.id]);
  if (avvisa && chiave === prima) {
    toast(tuttoBloccato ? "Niente da cambiare: sblocca i capi che vuoi sostituire." : "Nessuna combinazione nuova con questi capi: prova un'altra stagione.");
  } else if (avvisa && salvate.has(chiave)) toast("Questa combinazione l'hai già salvata.");
  if (avvisa && !Object.values(b.slot).some(Boolean)) toast("Nessun capo adatto a stagione e occasione scelte.");
}

// ───────────────────────────── disegno
export function render(s, { rotta }) {
  const modifica = rotta.param[1] === "modifica";
  const id = modifica ? rotta.param[0] : null;
  if (s.capi == null || s.outfit == null) return html`${barra({ indietro: "Annulla", href: "#/outfit" })}<p class="nota">Carico…</p>`;
  if (modifica) {
    const o = trovaOutfit(id);
    if (!o) return html`${barra({ indietro: "Outfit", href: "#/outfit" })}${vuoto({ icona: "layers", titolo: "Outfit non trovato", testo: "Forse è stato eliminato." })}`;
    if (bozza?.id !== id) bozza = daOutfit(o);
  } else if (!bozza || bozza.id) {
    bozza = nuova();
  }
  const b = bozza;
  if (b.daGenerare) {
    b.daGenerare = false;
    generaOra({ avvisa: false });
  }

  const capi = capiDellaBozza(b).map(trovaCapo).filter(Boolean);
  const segnaposto = capi.length >= 2 ? nomeOutfit({ nome: "" }, capi) : "Es. Ufficio d'inverno";

  return html`
    ${barra({ indietro: "Annulla", href: b.ritorno, titolo: modifica ? "Modifica outfit" : "Nuovo outfit" })}
    <div class="compositore">
      <fieldset class="gruppo">
        <legend>Stagione</legend>
        <div class="chips">${voci("stagione", { scelte: b.stagioni }).map((v) => chipContesto("stagioni", v, b.stagioni))}</div>
      </fieldset>
      <fieldset class="gruppo">
        <legend>Occasione</legend>
        <div class="chips">${voci("occasione", { scelte: b.occasioni }).map((v) => chipContesto("occasioni", v, b.occasioni))}</div>
      </fieldset>

      <div class="genera">
        <button class="btn largo" type="button" data-azione="genera">${icona("shuffle", 20)}${b.viste.size ? "Un'altra proposta" : "Genera"}</button>
        <p class="aiuto">Blocca i capi che vuoi tenere: Genera cambia solo gli altri.</p>
      </div>

      <ul class="slot-lista">
        ${SLOT.map((def, i) => rigaSlot(def, b, i))}
      </ul>
      ${b.extra.length ? html`
        <div class="gruppo">
          <p class="etichetta">Altri capi</p>
          <div class="chips">${b.extra.map((cid) => html`
            <button class="chip" type="button" data-azione="togli-extra" data-capo="${cid}" aria-label="Togli ${nomeCapo(trovaCapo(cid) || {})}">
              ${trovaCapo(cid) ? nomeCapo(trovaCapo(cid)) : "Capo"}${icona("x", 15)}
            </button>`)}</div>
        </div>` : ""}

      <label class="campo">
        <span>Nome <small>facoltativo</small></span>
        <input type="text" data-input="outfit" data-campo="nome" value="${b.nome}" maxlength="80" placeholder="${segnaposto}" autocomplete="off">
      </label>
      <label class="campo">
        <span>Note <small>facoltative</small></span>
        <textarea data-input="outfit" data-campo="note" rows="2" maxlength="2000">${b.note}</textarea>
      </label>
      <div>
        <button class="chip" type="button" data-azione="preferito-bozza" aria-pressed="${b.preferito}">
          ${icona("heart", 17, 2)}${b.preferito ? "Tra i preferiti" : "Aggiungi ai preferiti"}
        </button>
      </div>
    </div>

    <div class="barra-salva">
      <button class="btn primario largo" type="button" data-azione="salva-outfit" ${b.salvataggio ? html`aria-busy="true" disabled` : ""}>
        ${b.salvataggio ? "Salvo…" : "Salva outfit"}
      </button>
    </div>`;
}

const chipContesto = (campo, v, scelte) => {
  const on = scelte.includes(v.slug);
  return html`
    <button class="chip" type="button" data-azione="contesto" data-campo="${campo}" data-valore="${v.slug}" aria-pressed="${on}">
      ${on ? icona("check", 15, 2.6) : ""}${v.nome}
    </button>`;
};

function rigaSlot(def, b, i = 0) {
  const c = b.slot[def.id] ? trovaCapo(b.slot[def.id]) : null;
  const bloccato = b.bloccati.has(def.id);
  return html`
    <li class="slot" data-key="slot:${def.id}" style="--n:${i}">
      <button class="slot-scelta" type="button" data-azione="scegli-slot" data-slot="${def.id}" data-key="${def.id}:${c?.id || "vuoto"}">
        ${c ? foto(c.miniatura) : html`<div class="foto vuoto-slot">${icona("plus", 18)}</div>`}
        <span class="slot-testo">
          <span class="slot-nome">${def.nome}</span>
          <span class="slot-capo">${c ? nomeCapo(c) : bloccato ? "Nessuno, per scelta" : "Nessuno"}</span>
        </span>
        ${icona("chevron-right", 18)}
      </button>
      ${c || bloccato ? html`
        <button class="icona-btn blocco" type="button" data-azione="blocca" data-slot="${def.id}" aria-pressed="${bloccato}"
          aria-label="${bloccato ? `Sblocca ${def.nome.toLowerCase()}` : `Blocca ${def.nome.toLowerCase()}`}">
          ${icona(bloccato ? "lock" : "lock-open", 18)}
        </button>` : html`<span class="blocco-posto" aria-hidden="true"></span>`}
    </li>`;
}

/** Foglio per scegliere a mano il capo di uno slot: prima quelli adatti a stagione e occasione. */
function scelta(slotId) {
  const def = SLOT.find((s) => s.id === slotId);
  const b = bozza;
  const tutti = (stato.capi || []).filter((c) => def.categorie.includes(c.categoria) && c.stato !== "wishlist");
  const adatti = tutti.filter((c) => idoneo({ ...c, stato: "armadio" }, b));
  const altri = tutti.filter((c) => !adatti.includes(c));
  const tessera = (c) => html`
    <li>
      <button class="tessera scelta-capo" type="button" data-azione="metti-in-slot" data-slot="${slotId}" data-capo="${c.id}" aria-pressed="${b.slot[slotId] === c.id}">
        ${foto(c.miniatura)}
        ${b.slot[slotId] === c.id ? html`<span class="spunta">${icona("check", 15, 3)}</span>` : ""}
        <span class="tessera-nome">${nomeCapo(c)}</span>
      </button>
    </li>`;
  const categorie = def.categorie.map((k) => nomeVoce("categoria", k)).join(", ");
  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa">
      <h2 id="foglio-titolo">${def.nome}</h2>
      <button class="icona-btn" type="button" data-azione="chiudi-foglio" aria-label="Chiudi">${icona("x")}</button>
    </div>
    ${b.slot[slotId] ? html`<p><button class="link" type="button" data-azione="metti-in-slot" data-slot="${slotId}" data-capo="">Togli: nessun capo in questo slot</button></p>` : ""}
    ${!tutti.length ? html`<p class="foglio-testo">Nell'armadio non c'è niente in ${categorie}.</p>` : ""}
    ${adatti.length ? html`<ul class="griglia">${adatti.map(tessera)}</ul>` : ""}
    ${altri.length ? html`<p class="etichetta separata">Fuori stagione o occasione</p><ul class="griglia">${altri.map(tessera)}</ul>` : ""}`;
}

// ───────────────────────────── azioni
async function salva() {
  const b = bozza;
  if (!b || b.salvataggio) return;
  const capi = capiDellaBozza(b);
  if (capi.length < 2) return toast("Scegli almeno due capi.");
  b.salvataggio = true;
  aggiorna({});
  try {
    const o = await salvaOutfit({ ...b, capi });
    bozza = null;
    toast(b.id ? "Modifiche salvate." : "Outfit salvato.");
    sostituisci(`outfit/${o.id}`);
  } catch (e) {
    console.error("salvataggio outfit", e);
    b.salvataggio = false;
    aggiorna({});
    toast("Salvataggio non riuscito. Riprova.");
  }
}

export const azioni = {
  genera: () => {
    generaOra();
    aggiorna({});
  },
  contesto: (el) => {
    bozza[el.dataset.campo] = alterna(bozza[el.dataset.campo], el.dataset.valore);
    aggiorna({});
  },
  blocca: (el) => {
    const id = el.dataset.slot;
    if (bozza.bloccati.has(id)) bozza.bloccati.delete(id);
    else bozza.bloccati.add(id);
    aggiorna({});
  },
  "scegli-slot": (el) => apriFoglio(scelta(el.dataset.slot)),
  "metti-in-slot": (el) => {
    const { slot, capo } = el.dataset;
    bozza.slot[slot] = capo || null;
    bozza.bloccati.add(slot); // scelto a mano, anche "nessuno": Genera non lo tocca finché non lo sblocchi
    chiudiFoglio();
    aggiorna({});
  },
  "togli-extra": (el) => {
    bozza.extra = bozza.extra.filter((c) => c !== el.dataset.capo);
    aggiorna({});
  },
  "preferito-bozza": () => {
    bozza.preferito = !bozza.preferito;
    aggiorna({});
  },
  "salva-outfit": salva,
};

export const input = {
  outfit: (el) => {
    if (bozza) bozza[el.dataset.campo] = el.value;
  },
};
