import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { aggiorna, stato, trovaCapo } from "../stato.js";
import { voci, STATI } from "../voci.js";
import { alterna } from "../filtri.js";
import { preparaFoto, urlInCache } from "../foto.js";
import { salvaCapo } from "../dati.js";
import { sostituisci } from "../router.js";
import { toast } from "../ui/avvisi.js";
import { barra, vuoto, pallino } from "./comuni.js";

export const conTabbar = false;
export const fab = () => "";

// La bozza vive qui finché non la salvi o annulli. I campi di testo la aggiornano senza ridisegnare.
let bozza = null;

const nuova = () => ({
  id: null,
  categoria: null,
  colore: null,
  colori_secondari: [],
  stagioni: [],
  occasioni: [],
  stato: "armadio",
  nome: "",
  marca: "",
  note: "",
  foto: null,          // foto nuova preparata nel browser
  fotoAttuale: null,   // percorso della foto già salvata
  fotoRimossa: false,
  inPreparazione: false,
  salvataggio: false,
});

const daCapo = (c) => ({
  ...nuova(),
  id: c.id,
  categoria: c.categoria,
  colore: c.colore,
  colori_secondari: [...c.colori_secondari],
  stagioni: [...c.stagioni],
  occasioni: [...c.occasioni],
  stato: c.stato,
  nome: c.nome || "",
  marca: c.marca || "",
  note: c.note || "",
  fotoAttuale: c.foto,
});

/** Parte una bozza nuova, con la foto appena scelta se c'è. */
export function nuovaBozza(file) {
  liberaAnteprime();
  bozza = nuova();
  if (file) cambiaFoto(file);
}

export function cambiaFoto(file) {
  if (!bozza) bozza = nuova();
  liberaAnteprime();
  bozza.foto = null;
  bozza.fotoRimossa = false;
  bozza.inPreparazione = true;
  aggiorna({});
  const questa = bozza;
  preparaFoto(file)
    .then((f) => {
      if (bozza !== questa) return URL.revokeObjectURL(f.anteprima);
      bozza.foto = f;
    })
    .catch((e) => {
      console.error("foto", e);
      toast("Non riesco a leggere questa foto. Prova con un'altra.");
    })
    .finally(() => {
      if (bozza === questa) {
        bozza.inPreparazione = false;
        aggiorna({});
      }
    });
}

function liberaAnteprime() {
  if (bozza?.foto) {
    URL.revokeObjectURL(bozza.foto.anteprima);
    URL.revokeObjectURL(bozza.foto.anteprimaMini);
  }
}

export function render(s, { rotta }) {
  const modifica = rotta.nome === "capo";
  const id = modifica ? rotta.param[0] : null;
  if (modifica) {
    if (s.capi == null) return html`${barra({ indietro: "Annulla", href: "#/armadio" })}<p class="nota">Carico…</p>`;
    const capo = trovaCapo(id);
    if (!capo) return html`${barra({ indietro: "Armadio", href: "#/armadio" })}${vuoto({ icona: "hanger", titolo: "Capo non trovato", testo: "Forse è stato eliminato." })}`;
    if (bozza?.id !== id) bozza = daCapo(capo);
  } else if (!bozza || bozza.id) {
    bozza = nuova();
  }

  const b = bozza;
  const titolo = modifica ? "Modifica capo" : "Nuovo capo";
  const href = modifica ? `#/capo/${id}` : "#/armadio";
  const marche = [...new Set((s.capi || []).map((c) => c.marca).filter(Boolean))].sort((a, c) => a.localeCompare(c, "it"));
  const tuttoAnno = voci("stagione").every((v) => b.stagioni.includes(v.slug));

  return html`
    ${barra({ indietro: "Annulla", href, titolo })}
    <form class="editor" id="form-capo" novalidate>
      <section class="editor-foto">
        ${anteprima(b)}
        <button class="chip" type="button" data-azione="scegli-foto" data-modo="cambia">
          ${icona("camera", 18)}${b.foto || (b.fotoAttuale && !b.fotoRimossa) ? "Cambia foto" : "Aggiungi foto"}
        </button>
        ${b.foto || (b.fotoAttuale && !b.fotoRimossa)
          ? html`<button class="link" type="button" data-azione="togli-foto">Togli foto</button>` : ""}
      </section>

      ${gruppoUno("Categoria", "categoria", voci("categoria", { scelte: [b.categoria] }))}
      ${gruppoUno("Colore", "colore", voci("colore", { scelte: [b.colore] }), true)}

      <details class="gruppo" ${b.colori_secondari.length ? "open" : ""}>
        <summary>Altri colori${b.colori_secondari.length ? ` (${b.colori_secondari.length})` : ""}</summary>
        ${chipMolti("colori_secondari", voci("colore", { scelte: b.colori_secondari }).filter((v) => v.slug !== b.colore), true)}
      </details>

      <fieldset class="gruppo">
        <legend>Stagioni</legend>
        <div class="chips">
          <button class="chip" type="button" data-azione="tutto-anno" aria-pressed="${tuttoAnno}">
            ${tuttoAnno ? icona("check", 15, 2.6) : ""}Tutto l'anno
          </button>
          ${voci("stagione", { scelte: b.stagioni }).map((v) => chip("molti", "stagioni", v, b.stagioni.includes(v.slug)))}
        </div>
      </fieldset>

      <fieldset class="gruppo">
        <legend>Occasioni</legend>
        ${chipMolti("occasioni", voci("occasione", { scelte: b.occasioni }))}
      </fieldset>

      ${gruppoUno("Stato", "stato", STATI)}

      <label class="campo">
        <span>Nome <small>facoltativo</small></span>
        <input type="text" data-input="bozza" data-campo="nome" value="${b.nome}" maxlength="80"
          placeholder="Es. Maglione girocollo" autocomplete="off">
      </label>
      <label class="campo">
        <span>Marca <small>facoltativa</small></span>
        <input type="text" data-input="bozza" data-campo="marca" value="${b.marca}" maxlength="60" list="marche"
          autocomplete="off" autocapitalize="words">
        <datalist id="marche">${marche.map((m) => html`<option value="${m}"></option>`)}</datalist>
      </label>
      <label class="campo">
        <span>Note <small>facoltative</small></span>
        <textarea data-input="bozza" data-campo="note" rows="3" maxlength="2000">${b.note}</textarea>
      </label>
    </form>

    <div class="barra-salva">
      <button class="btn primario largo" type="button" data-azione="salva-capo"
        ${b.salvataggio || b.inPreparazione ? html`aria-busy="true" disabled` : ""}>
        ${b.salvataggio ? "Salvo…" : b.inPreparazione ? "Preparo la foto…" : "Salva capo"}
      </button>
    </div>`;
}

function anteprima(b) {
  if (b.inPreparazione) return html`<div class="foto grande attesa"><span>Preparo la foto…</span></div>`;
  if (b.foto) return html`<div class="foto grande"><img src="${b.foto.anteprima}" alt="Foto del capo"></div>`;
  if (b.fotoAttuale && !b.fotoRimossa) {
    const src = urlInCache(b.fotoAttuale);
    return html`<div class="foto grande"><img data-foto="${b.fotoAttuale}" ${src ? html`src="${src}"` : ""} alt="Foto del capo"></div>`;
  }
  return html`
    <button class="foto grande senza vuota" type="button" data-azione="scegli-foto" data-modo="cambia">
      ${icona("camera", 30, 1.5)}<span>Aggiungi una foto</span>
    </button>`;
}

function chip(tipo, campo, v, on, conPallino = false) {
  const attr = tipo === "uno" ? html`role="radio" aria-checked="${on}"` : html`aria-pressed="${on}"`;
  return html`
    <button class="chip" type="button" data-azione="bozza" data-tipo="${tipo}" data-campo="${campo}" data-valore="${v.slug}" ${attr}>
      ${on ? icona("check", 15, 2.6) : ""}${conPallino ? pallino(v.slug) : ""}${v.nome}
    </button>`;
}

function gruppoUno(titolo, campo, elenco, conPallino = false) {
  return html`
    <fieldset class="gruppo" id="gruppo-${campo}">
      <legend>${titolo}</legend>
      <div class="chips" role="radiogroup" aria-label="${titolo}">
        ${elenco.map((v) => chip("uno", campo, v, bozza[campo] === v.slug, conPallino))}
      </div>
    </fieldset>`;
}

const chipMolti = (campo, elenco, conPallino = false) => html`
  <div class="chips">${elenco.map((v) => chip("molti", campo, v, bozza[campo].includes(v.slug), conPallino))}</div>`;

// ───────────────────────────── azioni
async function salva() {
  const b = bozza;
  if (!b || b.salvataggio || b.inPreparazione) return;
  const manca = !b.categoria ? "categoria" : !b.colore ? "colore" : null;
  if (manca) {
    toast(manca === "categoria" ? "Scegli una categoria." : "Scegli un colore.");
    document.getElementById(`gruppo-${manca}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  b.salvataggio = true;
  aggiorna({});
  try {
    const capo = await salvaCapo(b);
    const eraNuovo = !b.id;
    bozza = null;
    toast(eraNuovo ? "Capo aggiunto." : "Modifiche salvate.");
    sostituisci(eraNuovo ? "armadio" : `capo/${capo.id}`);
  } catch (e) {
    console.error("salvataggio", e);
    b.salvataggio = false;
    aggiorna({});
    toast("Salvataggio non riuscito. Riprova.");
  }
}

export const azioni = {
  bozza: (el) => {
    const { campo, valore, tipo } = el.dataset;
    if (tipo === "uno") bozza[campo] = valore;
    else bozza[campo] = alterna(bozza[campo], valore);
    if (campo === "colore") bozza.colori_secondari = bozza.colori_secondari.filter((c) => c !== valore);
    aggiorna({});
  },
  "tutto-anno": () => {
    const tutte = voci("stagione").map((v) => v.slug);
    bozza.stagioni = tutte.every((s) => bozza.stagioni.includes(s)) ? [] : tutte;
    aggiorna({});
  },
  "togli-foto": () => {
    liberaAnteprime();
    bozza.foto = null;
    bozza.fotoRimossa = Boolean(bozza.fotoAttuale);
    aggiorna({});
  },
  "salva-capo": salva,
};

export const input = {
  bozza: (el) => {
    if (bozza) bozza[el.dataset.campo] = el.value;
  },
};

/** Annulla quando si esce dal form senza salvare. */
export function abbandona() {
  liberaAnteprime();
  bozza = null;
}
