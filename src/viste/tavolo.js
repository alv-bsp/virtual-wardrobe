// Il tavolo degli outfit: un piano a puntini su cui appoggi i capi come foto-adesivo.
// Li trascini su dal cassetto (o li tocchi), li sposti, li ruoti e ingrandisci con due dita, li butti giù nel
// cassetto per toglierli. Genera fa volare al loro posto i capi scelti dal generatore, tranne quelli col lucchetto.
//
// Il tavolo (#tavolo) è gestito a mano da questo modulo: morph non ne tocca i figli (data-morph-ignora).
// Il resto della pagina (barra, cassetto, pulsanti) si ridisegna come le altre viste.
// Per ora la disposizione vive solo mentre componi: si salva l'insieme dei capi, come prima.

import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { aggiorna, stato, trovaOutfit, trovaCapo, capiDiOutfit, usiDeiCapi } from "../stato.js";
import { voci, nomeCapo } from "../voci.js";
import { alterna } from "../filtri.js";
import { SLOT, slotDi, genera, chiaveCapi, stagioneCorrente, slotDaCapi } from "../outfit.js";
import { salvaOutfit } from "../dati.js";
import { POSTI, posaPredefinita, unita } from "../disposizione.js";
import { sostituisci } from "../router.js";
import { apriFoglio, chiudiFoglio, toast } from "../ui/avvisi.js";
import { urlFirmati, urlInCache } from "../foto.js";
import { movimentoRidotto, anima } from "../ui/tocco.js";
import { barra, vuoto, foto } from "./comuni.js";

export const conTabbar = false;
export const classeVista = "vista-tavolo";

const NOMI_CASSETTO = { giacca: "Giacche", maglia: "Maglie", sopra: "Sopra", sotto: "Sotto", scarpe: "Scarpe", accessori: "Accessori" };
const limita = (v, a, b) => Math.min(b, Math.max(a, v));
const casuale = (a, b) => a + Math.random() * (b - a);

// ───────────────────────────── bozza

let bozza = null;
let tavolo = null; // il controller montato sul tavolo della pagina attuale

const slotVuoti = () => Object.fromEntries(SLOT.map((s) => [s.id, null]));
const capiDellaBozza = (b) => [...Object.values(b.slot), ...b.extra].filter(Boolean);

function nuova({ ritorno = "#/outfit" } = {}) {
  return {
    id: null,
    slot: slotVuoti(),
    extra: [],
    pose: new Map(),       // capo → { x, y, w, s, r, z }
    bloccati: new Set(),
    stagioni: [stagioneCorrente()],
    occasioni: [],
    nome: "",
    note: "",
    preferito: false,
    filtro: null,          // strato mostrato nel cassetto
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
    stagioni: [...o.stagioni],
    occasioni: [...o.occasioni],
    nome: o.nome || "",
    note: o.note || "",
    preferito: o.preferito,
    daGenerare: false,
  };
}

export function nuovoOutfit() {
  bozza = nuova();
}

/** Outfit nuovo attorno a un capo: il capo resta sul tavolo col lucchetto, il resto lo genera. */
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
  tavolo?.smonta();
  tavolo = null;
  bozza = null;
}

// ───────────────────────────── disegno della pagina (tutto tranne il tavolo)

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
  const sulTavolo = capiDellaBozza(b).length;

  return html`
    <div class="tavolo-pagina">
      ${barra({
        indietro: "Annulla",
        href: b.ritorno,
        titolo: modifica ? "Modifica outfit" : "Nuovo outfit",
        azione: html`<button class="btn piccolo primario" type="button" data-azione="salva-tavolo">Salva</button>`,
      })}
      <button class="contesto-tavolo" type="button" data-azione="contesto-tavolo">
        ${icona("sliders", 16)}<span>${descriviContesto(b)}</span>
      </button>
      <div class="tavolo-cornice">
        <div class="tavolo" id="tavolo" data-morph-ignora></div>
        ${sulTavolo ? "" : html`<p class="tavolo-suggerimento" data-key="suggerimento">Trascina qui i capi dal cassetto,<br>oppure tocca il tasto rosso per una proposta.</p>`}
        <button class="icona-btn tavolo-svuota" data-key="svuota" type="button" data-azione="svuota-tavolo" aria-label="Svuota il tavolo" ${sulTavolo ? "" : "disabled"}>${icona("trash", 18)}</button>
        <button class="tasto-cta tavolo-genera" data-key="genera" type="button" data-azione="genera-tavolo" aria-label="Genera un outfit">
          <span class="incisa">${icona("shuffle", 24, 2.4)}</span>
        </button>
      </div>
      ${cassetto(s, b)}
    </div>`;
}

function descriviContesto(b) {
  const stagioni = b.stagioni.length === 4 || !b.stagioni.length ? "Tutto l'anno" : b.stagioni.map((x) => voci("stagione").find((v) => v.slug === x)?.nome || x).join(", ");
  const occasioni = b.occasioni.length ? b.occasioni.map((x) => voci("occasione").find((v) => v.slug === x)?.nome || x).join(", ") : "ogni occasione";
  return `${stagioni} · ${occasioni}`;
}

function cassetto(s, b) {
  const posseduti = s.capi.filter((c) => c.stato !== "wishlist");
  const strati = SLOT.filter((def) => posseduti.some((c) => def.categorie.includes(c.categoria)));
  const ordine = (c) => SLOT.findIndex((d) => d.id === slotDi(c));
  const elenco = posseduti
    .filter((c) => !b.filtro || slotDi(c) === b.filtro)
    .sort((a, c) => ordine(a) - ordine(c) || nomeCapo(a).localeCompare(nomeCapo(c), "it"));
  const sulTavolo = new Set(capiDellaBozza(b));
  return html`
    <div class="cassetto" id="cassetto">
      <div class="cassetto-togli" aria-hidden="true">${icona("trash", 18)}Lascia qui per togliere</div>
      <div class="chips-riga cassetto-filtri" role="group" aria-label="Strati">
        <button class="chip" type="button" data-azione="filtro-cassetto" data-valore="" aria-pressed="${!b.filtro}">Tutti</button>
        ${strati.map((def) => html`
          <button class="chip" type="button" data-azione="filtro-cassetto" data-valore="${def.id}" aria-pressed="${b.filtro === def.id}">${NOMI_CASSETTO[def.id]}</button>`)}
      </div>
      <ul class="cassetto-lista">
        ${elenco.map((c) => html`
          <li data-key="${c.id}">
            <button class="pezzo-cassetto" type="button" data-capo="${c.id}" aria-pressed="${sulTavolo.has(c.id)}" aria-label="${nomeCapo(c)}">
              ${foto(c.miniatura)}
              ${sulTavolo.has(c.id) ? html`<span class="spunta">${icona("check", 13, 3)}</span>` : ""}
            </button>
          </li>`)}
      </ul>
    </div>`;
}

/** Dopo ogni disegno: monta il controller sul tavolo, se la pagina è nuova. */
export function monta(radice) {
  const el = radice.querySelector("#tavolo");
  if (!el || !bozza || el === tavolo?.el) return;
  tavolo?.smonta();
  tavolo = new Tavolo(el, bozza);
}

// ───────────────────────────── il tavolo

class Tavolo {
  constructor(el, b) {
    this.el = el;
    this.b = b;
    this.nodi = new Map(); // strato → nodo del pezzo
    this.zona = new Map(); // strato → sagoma tratteggiata
    this.z = 10;
    this.gesto = null;
    this.dalCassetto = null;
    this.selezionato = null;
    this.attrezzi = null;
    this.alRidimensionare = () => this.riposiziona();
    window.addEventListener("resize", this.alRidimensionare);

    this.disegnaZone();
    for (const def of SLOT) if (b.slot[def.id]) this.metti(def.id, b.slot[def.id], { animato: false, aggiornaPagina: false });
    this.ascolta();
    if (b.daGenerare) {
      b.daGenerare = false;
      requestAnimationFrame(() => this.genera({ avvisa: false }));
    }
  }

  smonta() {
    window.removeEventListener("resize", this.alRidimensionare);
    this.fantasma?.remove();
  }

  get W() { return this.el.clientWidth || 1; }
  get H() { return this.el.clientHeight || 1; }
  /** Unità delle misure dei capi: la larghezza, ma su un tavolo basso (iPhone piccoli, finestre larghe) si stringe. */
  get U() { return unita(this.W, this.H); }

  // ── pezzi

  posa(capoId, strato) {
    // Stessa posa di partenza della scheda dell'outfit: salvato o riaperto in Modifica, l'outfit ha lo stesso aspetto.
    if (!this.b.pose.has(capoId)) this.b.pose.set(capoId, posaPredefinita(capoId, strato));
    return this.b.pose.get(capoId);
  }

  trasforma(p, { inclina = 0, solleva = false } = {}) {
    return `translate(${p.x * this.W}px, ${p.y * this.H}px) translate(-50%, -50%) rotate(${p.r + inclina}deg) scale(${p.s * (solleva ? 1.06 : 1)})`;
  }

  applica(strato, opzioni) {
    const nodo = this.nodi.get(strato);
    const p = this.b.pose.get(this.b.slot[strato]);
    if (!nodo || !p) return;
    nodo.style.width = `${p.w * this.U}px`;
    nodo.style.zIndex = p.z;
    nodo.style.transform = this.trasforma(p, opzioni);
    nodo.classList.toggle("bloccato", this.b.bloccati.has(strato));
  }

  riposiziona() {
    this.misuraZone();
    for (const strato of this.nodi.keys()) {
      const n = this.nodi.get(strato);
      n.style.transition = "none";
      this.applica(strato);
      void n.offsetWidth;
      n.style.transition = "";
    }
    this.posizionaAttrezzi();
  }

  creaNodo(c, strato) {
    const n = document.createElement("div");
    n.className = "pezzo";
    n.dataset.slot = strato;
    n.dataset.capo = c.id;
    n.innerHTML = `<div class="pezzo-carta"><img alt="" draggable="false"></div><span class="pezzo-lucchetto">${icona("lock", 13, 2.6)}</span>`;
    const img = n.querySelector("img");
    img.alt = nomeCapo(c);
    if (!c.foto && !c.miniatura) n.classList.add("senza-foto");
    // Subito la miniatura (già in memoria dal cassetto), poi la foto grande appena scaricata: niente buchi bianchi.
    const subito = urlInCache(c.foto) || urlInCache(c.miniatura);
    if (subito) img.src = subito;
    if (!urlInCache(c.foto) && c.foto) {
      urlFirmati([c.foto, c.miniatura].filter(Boolean)).then((url) => {
        const grande = url(c.foto);
        if (!grande) return;
        const pre = new Image();
        pre.onload = () => { img.src = grande; };
        pre.src = grande;
        if (!img.getAttribute("src") && url(c.miniatura)) img.src = url(c.miniatura);
      });
    }
    return n;
  }

  /** Mette un capo nel suo strato (sostituendo quello che c'era). da: punto dello schermo da cui vola dentro. */
  metti(strato, capoId, { animato = true, da = null, a = null, inclina = 0, ritardo = 0, aggiornaPagina = true } = {}) {
    const c = trovaCapo(capoId);
    if (!c) return;
    if (this.nodi.has(strato) && this.b.slot[strato] !== capoId) this.togli(strato, { aggiornaPagina: false });
    else if (this.nodi.has(strato)) this.nodi.get(strato).remove();
    this.b.slot[strato] = capoId;
    const p = this.posa(capoId, strato);
    if (a) {
      p.x = limita(a.x, .08, .92);
      p.y = limita(a.y, .08, .92);
    }
    p.z = ++this.z;
    const nodo = this.creaNodo(c, strato);
    this.el.append(nodo);
    this.nodi.set(strato, nodo);
    this.zona.get(strato)?.classList.add("piena");

    if (animato && !movimentoRidotto()) {
      // Lasciato dal dito: parte da dov'è il fantasma, sollevato, e si posa. Da un tocco o dal dado: vola dentro.
      const r = this.el.getBoundingClientRect();
      const partenza = a
        ? { ...p, r: inclina, s: 1.06 }
        : da
          ? { ...p, x: (da.x - r.left) / this.W, y: (da.y - r.top) / this.H, s: .3, r: p.r - 25 }
          : { ...p, y: 1.25, s: .5, r: p.r + casuale(-40, 40) };
      nodo.style.transition = "none";
      nodo.style.width = `${p.w * this.U}px`;
      nodo.style.zIndex = p.z;
      nodo.style.transform = this.trasforma(partenza);
      nodo.style.opacity = a ? "1" : "0";
      void nodo.offsetWidth;
      nodo.style.transition = `transform .62s var(--molla) ${ritardo}ms, opacity .25s ease ${ritardo}ms`;
      nodo.style.opacity = "1";
      setTimeout(() => { if (!nodo.classList.contains("sollevato")) nodo.style.transition = ""; }, 680 + ritardo);
    }
    this.applica(strato);
    if (aggiornaPagina) aggiorna({});
  }

  /** Toglie il capo dallo strato: scivola giù verso il cassetto e sparisce. */
  togli(strato, { aggiornaPagina = true } = {}) {
    const n = this.nodi.get(strato);
    if (!n) return;
    this.nodi.delete(strato);
    this.b.slot[strato] = null;
    this.b.bloccati.delete(strato);
    this.zona.get(strato)?.classList.remove("piena");
    if (this.selezionato === strato) this.seleziona(null);
    if (movimentoRidotto()) n.remove();
    else {
      const p = this.b.pose.get(n.dataset.capo) || { ...POSTI[strato], s: 1, r: 0 };
      n.style.pointerEvents = "none";
      n.style.transition = "transform .38s cubic-bezier(.5, 0, .9, .4), opacity .3s ease .08s";
      n.style.transform = this.trasforma({ ...p, y: 1.2, s: .4, r: (p.r || 0) + casuale(-30, 30) });
      n.style.opacity = "0";
      setTimeout(() => n.remove(), 420);
    }
    if (aggiornaPagina) aggiorna({});
  }

  svuota() {
    [...this.nodi.keys()].forEach((s, i) => setTimeout(() => this.togli(s, { aggiornaPagina: false }), i * 50));
    setTimeout(() => aggiorna({}), this.nodi.size * 50 + 20);
  }

  /** Il generatore riempie gli strati senza lucchetto; i capi cambiati escono e i nuovi volano dentro. */
  genera({ avvisa = true } = {}) {
    if (!stato.capi?.length) return avvisa && toast("Aggiungi qualche capo all'armadio per generare outfit.");
    const b = this.b;
    const salvate = new Set((stato.outfit || []).filter((o) => o.id !== b.id).map((o) => chiaveCapi(capiDiOutfit(o.id).map((c) => c.id))));
    const prima = chiaveCapi(capiDellaBozza(b));
    const nuovo = genera({
      slot: { ...b.slot },
      bloccati: b.bloccati,
      stagioni: b.stagioni,
      occasioni: b.occasioni,
      capi: stato.capi,
      usi: usiDeiCapi(),
      daEvitare: new Set([...b.viste, ...salvate]),
    });
    let n = 0;
    for (const def of SLOT) {
      const ora = b.slot[def.id];
      const dopo = nuovo[def.id];
      if (ora === dopo) continue;
      if (ora && !dopo) this.togli(def.id, { aggiornaPagina: false });
      if (dopo) {
        b.pose.delete(dopo); // posa fresca, al suo posto
        this.metti(def.id, dopo, { ritardo: 70 * n++, aggiornaPagina: false });
      }
    }
    const chiave = chiaveCapi(capiDellaBozza(b));
    b.viste.add(chiave);
    if (avvisa && chiave === prima) toast(b.bloccati.size ? "Niente da cambiare: togli qualche lucchetto." : "Nessuna combinazione nuova con questi capi.");
    else if (avvisa && salvate.has(chiave)) toast("Questa combinazione l'hai già salvata.");
    if (avvisa && !Object.values(b.slot).some(Boolean)) toast("Nessun capo adatto a stagione e occasione scelte.");
    aggiorna({});
  }

  // ── sagome degli strati: compaiono solo mentre porti un capo dal cassetto, e si accende quella del suo strato

  disegnaZone() {
    for (const def of SLOT) {
      const z = document.createElement("div");
      z.className = "zona";
      z.dataset.slot = def.id;
      z.textContent = def.nome;
      this.el.append(z);
      this.zona.set(def.id, z);
    }
    this.misuraZone();
  }

  misuraZone() {
    for (const [id, z] of this.zona) {
      const p = POSTI[id];
      const w = p.w * this.U, h = w * p.a;
      Object.assign(z.style, { left: `${p.x * this.W - w / 2}px`, top: `${p.y * this.H - h / 2}px`, width: `${w}px`, height: `${h}px` });
    }
  }

  accendiZona(strato) {
    this.el.classList.toggle("mostra-zone", Boolean(strato));
    for (const [id, z] of this.zona) z.classList.toggle("accesa", id === strato);
  }

  // ── barretta del capo selezionato: lucchetto e togli

  seleziona(strato) {
    this.selezionato = strato === this.selezionato ? null : strato;
    for (const [s, n] of this.nodi) n.classList.toggle("selezionato", s === this.selezionato);
    this.attrezzi?.remove();
    this.attrezzi = null;
    if (!this.selezionato) return;
    const a = document.createElement("div");
    a.className = "attrezzi";
    const chiuso = this.b.bloccati.has(this.selezionato);
    a.innerHTML = `
      <button type="button" data-attrezzo="blocca" aria-pressed="${chiuso}" aria-label="${chiuso ? "Togli il lucchetto" : "Metti il lucchetto"}">${icona(chiuso ? "lock" : "lock-open", 17)}</button>
      <button type="button" data-attrezzo="togli" aria-label="Togli dal tavolo">${icona("x", 18)}</button>`;
    this.el.append(a);
    this.attrezzi = a;
    this.posizionaAttrezzi();
  }

  posizionaAttrezzi() {
    if (!this.attrezzi || !this.selezionato) return;
    const n = this.nodi.get(this.selezionato);
    if (!n) return;
    const r = n.getBoundingClientRect(), t = this.el.getBoundingClientRect();
    this.attrezzi.style.left = `${r.left + r.width / 2 - t.left}px`;
    this.attrezzi.style.top = `${Math.max(8, r.top - t.top - 10)}px`;
  }

  // ── gesti

  ascolta() {
    const el = this.el;
    el.addEventListener("pointerdown", (e) => this.giuSulTavolo(e));
    el.addEventListener("pointermove", (e) => this.muoviSulTavolo(e));
    el.addEventListener("pointerup", (e) => this.suSulTavolo(e));
    el.addEventListener("pointercancel", (e) => this.suSulTavolo(e, true));
    el.addEventListener("wheel", (e) => this.rotellina(e), { passive: false });
    el.addEventListener("click", (e) => this.attrezzo(e));

    const cassetto = document.getElementById("cassetto");
    cassetto.addEventListener("pointerdown", (e) => this.giuNelCassetto(e));
    cassetto.addEventListener("pointermove", (e) => this.muoviDalCassetto(e));
    cassetto.addEventListener("pointerup", (e) => this.suDalCassetto(e));
    cassetto.addEventListener("pointercancel", () => this.annullaCassetto());
    cassetto.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  attrezzo(e) {
    const btn = e.target.closest("[data-attrezzo]");
    if (!btn || !this.selezionato) return;
    const strato = this.selezionato;
    if (btn.dataset.attrezzo === "togli") return this.togli(strato);
    if (this.b.bloccati.has(strato)) this.b.bloccati.delete(strato);
    else this.b.bloccati.add(strato);
    this.applica(strato);
    this.selezionato = null;
    this.seleziona(strato); // ridisegna la barretta col lucchetto giusto
  }

  sopraCassetto(x, y) {
    const r = document.getElementById("cassetto")?.getBoundingClientRect();
    return r && y > r.top && x >= r.left && x <= r.right;
  }

  segnalaCassetto(acceso) {
    document.getElementById("cassetto")?.classList.toggle("pronto-a-togliere", acceso);
  }

  giuSulTavolo(e) {
    if (e.target.closest(".attrezzi")) return;
    if (this.gesto && this.gesto.dita.size === 1) {
      // secondo dito, anche fuori dal capo: pizzica per ingrandire, gira per ruotare
      e.preventDefault();
      this.gesto.nodo.setPointerCapture(e.pointerId);
      this.gesto.dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.iniziaPizzico();
      return;
    }
    const n = e.target.closest(".pezzo");
    if (!n) {
      if (!this.gesto) this.seleziona(null);
      return;
    }
    e.preventDefault();
    const strato = n.dataset.slot;
    n.setPointerCapture(e.pointerId);
    n.style.transition = ""; // se stava ancora atterrando, da qui in poi comanda il dito
    const p = this.b.pose.get(this.b.slot[strato]);
    p.z = ++this.z;
    n.style.zIndex = p.z;
    this.gesto = {
      strato, nodo: n, p0: { ...p },
      dita: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
      partenza: { x: e.clientX, y: e.clientY },
      ultimo: { x: e.clientX, t: performance.now() },
      inclina: 0, mosso: false, pizzico: null,
    };
  }

  iniziaPizzico() {
    const g = this.gesto;
    const [a, b] = [...g.dita.values()];
    const p = this.b.pose.get(this.b.slot[g.strato]);
    g.pizzico = { d0: Math.hypot(b.x - a.x, b.y - a.y), ang0: Math.atan2(b.y - a.y, b.x - a.x), s0: p.s, r0: p.r, c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, p0: { ...p } };
    g.mosso = true;
  }

  muoviSulTavolo(e) {
    const g = this.gesto;
    if (!g || !g.dita.has(e.pointerId)) return;
    g.dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = this.b.pose.get(this.b.slot[g.strato]);
    if (!p) return;

    if (g.dita.size >= 2 && g.pizzico) {
      const [a, b] = [...g.dita.values()];
      const z = g.pizzico;
      p.s = limita(z.s0 * (Math.hypot(b.x - a.x, b.y - a.y) / (z.d0 || 1)), .45, 2.4);
      p.r = z.r0 + ((Math.atan2(b.y - a.y, b.x - a.x) - z.ang0) * 180) / Math.PI;
      p.x = z.p0.x + ((a.x + b.x) / 2 - z.c0.x) / this.W;
      p.y = z.p0.y + ((a.y + b.y) / 2 - z.c0.y) / this.H;
      g.nodo.classList.add("sollevato");
      g.nodo.style.transform = this.trasforma(p, { solleva: true });
      this.posizionaAttrezzi();
      return;
    }

    const dx = e.clientX - g.partenza.x, dy = e.clientY - g.partenza.y;
    if (!g.mosso && Math.hypot(dx, dy) < 6) return;
    if (!g.mosso) {
      g.mosso = true;
      this.attrezzi?.remove();
      this.attrezzi = null;
      document.getElementById("cassetto")?.classList.add("trascinando");
    }
    // Un filo di fisica: il capo si inclina nel verso in cui lo trascini, come un foglio.
    const ora = performance.now();
    const v = (e.clientX - g.ultimo.x) / Math.max(8, ora - g.ultimo.t);
    g.inclina = limita(g.inclina * .7 + v * 9, -14, 14);
    g.ultimo = { x: e.clientX, t: ora };
    p.x = g.p0.x + dx / this.W;
    p.y = g.p0.y + dy / this.H;
    g.nodo.classList.add("sollevato");
    g.nodo.style.transform = this.trasforma(p, { inclina: g.inclina, solleva: true });
    this.segnalaCassetto(this.sopraCassetto(e.clientX, e.clientY));
  }

  suSulTavolo(e, annullato = false) {
    const g = this.gesto;
    if (!g || !g.dita.has(e.pointerId)) return;
    g.dita.delete(e.pointerId);
    if (g.dita.size) { // resta un dito: si ricomincia a trascinare da qui
      const [d] = [...g.dita.values()];
      g.partenza = { ...d };
      g.p0 = { ...this.b.pose.get(this.b.slot[g.strato]) };
      g.pizzico = null;
      return;
    }
    this.gesto = null;
    g.nodo.classList.remove("sollevato");
    this.segnalaCassetto(false);
    document.getElementById("cassetto")?.classList.remove("trascinando");
    if (!g.mosso && !annullato) return this.seleziona(g.strato);
    if (!annullato && this.sopraCassetto(e.clientX, e.clientY)) return this.togli(g.strato);
    const p = this.b.pose.get(this.b.slot[g.strato]);
    p.x = limita(p.x, .06, .94);
    p.y = limita(p.y, .06, .94);
    this.applica(g.strato); // torna dritto e si posa con la molla
    if (this.selezionato === g.strato) setTimeout(() => this.posizionaAttrezzi(), 460);
  }

  rotellina(e) {
    const n = e.target.closest(".pezzo");
    if (!n) return;
    e.preventDefault();
    const p = this.b.pose.get(this.b.slot[n.dataset.slot]);
    if (e.shiftKey) p.r += e.deltaY * .15;
    else p.s = limita(p.s * (1 - e.deltaY * .0015), .45, 2.4);
    n.style.transition = "none";
    this.applica(n.dataset.slot);
    void n.offsetWidth;
    n.style.transition = "";
    this.posizionaAttrezzi();
  }

  // ── dal cassetto al tavolo

  giuNelCassetto(e) {
    const btn = e.target.closest(".pezzo-cassetto");
    if (!btn) return;
    this.dalCassetto = { btn, id: e.pointerId, x0: e.clientX, y0: e.clientY, capo: btn.dataset.capo, trascina: false };
  }

  muoviDalCassetto(e) {
    const d = this.dalCassetto;
    if (!d || d.id !== e.pointerId) return;
    if (!d.trascina) {
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (dy < -10 && Math.abs(dy) > Math.abs(dx)) {
        d.trascina = true;
        d.btn.setPointerCapture(e.pointerId);
        this.creaFantasma(d.capo, e.clientX, e.clientY);
        const c = trovaCapo(d.capo);
        if (c) this.accendiZona(slotDi(c));
      } else return;
    }
    e.preventDefault();
    this.muoviFantasma(e.clientX, e.clientY);
    const r = this.el.getBoundingClientRect();
    this.el.classList.toggle("in-arrivo", e.clientY < r.bottom && e.clientY > r.top);
  }

  suDalCassetto(e) {
    const d = this.dalCassetto;
    if (!d || d.id !== e.pointerId) return;
    this.dalCassetto = null;
    this.el.classList.remove("in-arrivo");
    this.accendiZona(null);
    const c = trovaCapo(d.capo);
    if (!c) return this.fantasma?.remove();
    const strato = slotDi(c);

    if (!d.trascina) { // un tocco: lo mette (o lo toglie, se è già sul tavolo)
      if (this.b.slot[strato] === c.id) return this.togli(strato);
      const r = d.btn.getBoundingClientRect();
      this.b.pose.delete(c.id);
      return this.metti(strato, c.id, { da: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
    }

    const t = this.el.getBoundingClientRect();
    const dentro = e.clientX > t.left && e.clientX < t.right && e.clientY > t.top && e.clientY < t.bottom;
    if (dentro) {
      this.fantasma.remove();
      this.fantasma = null;
      this.b.pose.delete(c.id);
      this.metti(strato, c.id, {
        a: { x: (e.clientX - t.left) / this.W, y: (e.clientY - t.top) / this.H },
        inclina: this.fantasmaInclina,
      });
    } else this.rimandaFantasma(d.btn);
  }

  annullaCassetto() {
    if (this.dalCassetto?.trascina) this.rimandaFantasma(this.dalCassetto.btn);
    this.dalCassetto = null;
    this.el.classList.remove("in-arrivo");
    this.accendiZona(null);
  }

  creaFantasma(capoId, x, y) {
    const c = trovaCapo(capoId);
    const strato = slotDi(c);
    const f = document.createElement("div");
    f.className = "pezzo fantasma sollevato";
    f.dataset.slot = strato;
    f.style.width = `${(POSTI[strato] || POSTI.accessori).w * this.U}px`; // già grande come sarà sul tavolo
    f.innerHTML = `<div class="pezzo-carta"><img alt="" draggable="false"></div>`;
    const src = urlInCache(c.miniatura) || urlInCache(c.foto);
    if (src) f.querySelector("img").src = src;
    document.body.append(f);
    this.fantasma = f;
    this.fantasmaInclina = 0;
    this.fantasmaUltimo = { x, t: performance.now() };
    this.muoviFantasma(x, y);
  }

  muoviFantasma(x, y) {
    if (!this.fantasma) return;
    const ora = performance.now();
    const v = (x - this.fantasmaUltimo.x) / Math.max(8, ora - this.fantasmaUltimo.t);
    this.fantasmaInclina = limita(this.fantasmaInclina * .7 + v * 9, -14, 14);
    this.fantasmaUltimo = { x, t: ora };
    this.fantasma.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${this.fantasmaInclina}deg) scale(1.06)`;
  }

  rimandaFantasma(btn) {
    const f = this.fantasma;
    this.fantasma = null;
    if (!f) return;
    const r = btn.getBoundingClientRect();
    f.style.transition = "transform .3s cubic-bezier(.4, 0, .2, 1), opacity .3s";
    f.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) translate(-50%, -50%) scale(.5)`;
    f.style.opacity = "0";
    setTimeout(() => f.remove(), 320);
  }
}

// ───────────────────────────── fogli: contesto e salvataggio

function chipVoce(campo, v, scelte, azione) {
  const on = scelte.includes(v.slug);
  return html`
    <button class="chip" type="button" data-azione="${azione}" data-campo="${campo}" data-valore="${v.slug}" aria-pressed="${on}">
      ${on ? icona("check", 15, 2.6) : ""}${v.nome}
    </button>`;
}

function foglioContesto(b) {
  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa">
      <h2 id="foglio-titolo">Per quando?</h2>
      <button class="icona-btn" type="button" data-azione="chiudi-foglio" aria-label="Chiudi">${icona("x")}</button>
    </div>
    <p class="foglio-testo">Il dado sceglie solo capi adatti a stagione e occasione.</p>
    <fieldset class="gruppo"><legend>Stagione</legend>
      <div class="chips">${voci("stagione").map((v) => chipVoce("stagioni", v, b.stagioni, "voce-tavolo"))}</div></fieldset>
    <fieldset class="gruppo"><legend>Occasione</legend>
      <div class="chips">${voci("occasione").map((v) => chipVoce("occasioni", v, b.occasioni, "voce-tavolo"))}</div></fieldset>
    <div class="foglio-azioni">
      <button class="btn" type="button" data-azione="chiudi-foglio">Chiudi</button>
      <button class="btn primario" type="button" data-azione="genera-dal-foglio">${icona("shuffle", 18)}Genera</button>
    </div>`;
}

function foglioSalva(b) {
  const capi = capiDellaBozza(b).map(trovaCapo).filter(Boolean);
  const segnaposto = capi.slice(0, 2).map(nomeCapo).join(" + ");
  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa">
      <h2 id="foglio-titolo">Salva l'outfit</h2>
      <button class="icona-btn" type="button" data-azione="chiudi-foglio" aria-label="Chiudi">${icona("x")}</button>
    </div>
    <label class="campo" style="margin-bottom: var(--s5)">
      <span>Nome <small>facoltativo</small></span>
      <input type="text" data-input="tavolo" data-campo="nome" value="${b.nome}" maxlength="80" placeholder="${segnaposto}" autocomplete="off">
    </label>
    <fieldset class="gruppo"><legend>Stagione</legend>
      <div class="chips">${voci("stagione").map((v) => chipVoce("stagioni", v, b.stagioni, "voce-salva"))}</div></fieldset>
    <fieldset class="gruppo"><legend>Occasione</legend>
      <div class="chips">${voci("occasione").map((v) => chipVoce("occasioni", v, b.occasioni, "voce-salva"))}</div></fieldset>
    <div class="gruppo">
      <button class="chip" type="button" data-azione="preferito-tavolo" aria-pressed="${b.preferito}">
        ${icona("heart", 17, 2)}${b.preferito ? "Tra i preferiti" : "Aggiungi ai preferiti"}
      </button>
    </div>
    <div class="foglio-azioni">
      <button class="btn" type="button" data-azione="chiudi-foglio">Annulla</button>
      <button class="btn primario" type="button" data-azione="conferma-salva-tavolo" ${b.salvataggio ? html`aria-busy="true" disabled` : ""}>
        ${b.salvataggio ? "Salvo…" : "Salva outfit"}
      </button>
    </div>`;
}

async function salva() {
  const b = bozza;
  if (!b || b.salvataggio) return;
  const capi = capiDellaBozza(b);
  b.salvataggio = true;
  apriFoglio(foglioSalva(b));
  try {
    const o = await salvaOutfit({ ...b, capi });
    chiudiFoglio();
    tavolo?.smonta();
    tavolo = null;
    bozza = null;
    toast(b.id ? "Modifiche salvate." : "Outfit salvato.");
    sostituisci(`outfit/${o.id}`);
  } catch (e) {
    console.error("salvataggio outfit", e);
    b.salvataggio = false;
    apriFoglio(foglioSalva(b));
    toast("Salvataggio non riuscito. Riprova.");
  }
}

export const azioni = {
  "genera-tavolo": (el) => {
    anima(el.querySelector("svg"), [{ transform: "rotate(0)" }, { transform: "rotate(200deg) scale(1.15)" }, { transform: "rotate(360deg)" }], { duration: 560 });
    tavolo?.genera();
  },
  "svuota-tavolo": () => tavolo?.svuota(),
  "filtro-cassetto": (el) => {
    bozza.filtro = el.dataset.valore || null;
    aggiorna({});
  },
  "contesto-tavolo": () => apriFoglio(foglioContesto(bozza)),
  "voce-tavolo": (el) => {
    bozza[el.dataset.campo] = alterna(bozza[el.dataset.campo], el.dataset.valore);
    apriFoglio(foglioContesto(bozza));
    aggiorna({});
  },
  "genera-dal-foglio": () => {
    chiudiFoglio();
    tavolo?.genera();
  },
  "salva-tavolo": () => {
    if (capiDellaBozza(bozza).length < 2) return toast("Metti almeno due capi sul tavolo.");
    apriFoglio(foglioSalva(bozza));
  },
  "voce-salva": (el) => {
    bozza[el.dataset.campo] = alterna(bozza[el.dataset.campo], el.dataset.valore);
    apriFoglio(foglioSalva(bozza));
    aggiorna({});
  },
  "preferito-tavolo": () => {
    bozza.preferito = !bozza.preferito;
    apriFoglio(foglioSalva(bozza));
  },
  "conferma-salva-tavolo": salva,
};

export const input = {
  tavolo: (el) => {
    if (bozza) bozza[el.dataset.campo] = el.value;
  },
};
