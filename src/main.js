import "./stile/tokens.css";
import "./stile/base.css";
import "./stile/componenti.css";

import { configurato } from "./config.js";
import { sb } from "./supabase.js";
import { stato, aggiorna, ascolta, azzeraDati } from "./stato.js";
import { caricaTutto } from "./dati.js";
import { idrataFoto } from "./foto.js";
import { esci } from "./accesso.js";
import { rotta, normalizza, vai, SEZIONI } from "./router.js";
import { html } from "./ui/html.js";
import { icona } from "./ui/icone.js";
import { toast, apriFoglio, chiudiFoglio, preparaFoglio } from "./ui/avvisi.js";
import { avviso } from "./viste/comuni.js";
import * as armadio from "./viste/armadio.js";
import * as outfit from "./viste/outfit.js";
import * as manca from "./viste/manca.js";
import * as capo from "./viste/capo.js";
import * as editor from "./viste/editor.js";
import * as filtri from "./viste/filtri.js";
import * as accesso from "./viste/accesso.js";
import * as account from "./viste/account.js";

const TAB = {
  armadio: { etichetta: "Armadio", icona: "shirt" },
  outfit: { etichetta: "Outfit", icona: "layers" },
  manca: { etichetta: "Cosa manca", icona: "pie" },
};
const app = document.getElementById("app");
const sceltaFoto = document.getElementById("scegli-foto");

function vistaPer(r) {
  if (r.nome === "nuovo") return editor;
  if (r.nome === "capo") return r.param[1] === "modifica" ? editor : capo;
  return { armadio, outfit, manca }[r.nome];
}

const inEditor = (r) => vistaPer(r) === editor;

// ───────────────────────────────────────── disegno
function guscio() {
  const r = rotta();
  const v = vistaPer(r);
  document.title = v.titolo && v.titolo !== "Armadio" ? `${v.titolo} · Armadio` : "Armadio";
  const contenuto = v.render(stato, { rotta: r, avviso: stato.errore ? avviso(stato.errore) : "" });
  return html`
    <main class="vista ${v.conTabbar ? "" : "senza-tabbar"}" id="vista">${contenuto}</main>
    ${v.conTabbar ? html`
      <div class="velo" aria-hidden="true"></div>
      ${v.fab(stato)}
      <nav class="tabbar" aria-label="Sezioni">
        ${SEZIONI.map((nome) => html`
          <a class="tab" href="#/${nome}" ${r.sezione === nome ? html`aria-current="page"` : ""}>
            ${icona(TAB[nome].icona, 22)}<span>${TAB[nome].etichetta}</span>
          </a>`)}
      </nav>` : ""}`;
}

function senzaConfigurazione() {
  return html`
    <main class="accesso">
      <div class="accesso-testa">
        ${icona("hanger", 48, 1.6)}
        <h1>Armadio</h1>
        <p>Manca la configurazione di Supabase. Imposta le Variables <b>SUPABASE_URL</b> e
        <b>SUPABASE_PUBLISHABLE_KEY</b> nel repo GitHub e rilancia il deploy (in locale: <b>.env.local</b>).</p>
      </div>
    </main>`;
}

/**
 * Ridisegna la vista giusta. La pagina di accesso non si ridisegna da sola, per non perdere quello che stai
 * scrivendo; nelle altre il campo attivo (ricerca, nome, note) riprende il fuoco e il cursore dov'erano.
 */
function disegna() {
  let nome, contenuto;
  if (!configurato) [nome, contenuto] = ["config", senzaConfigurazione()];
  else if (!stato.pronto) [nome, contenuto] = ["attesa", ""];
  else if (!stato.sessione) {
    if (app.dataset.vista === "accesso") return;
    [nome, contenuto] = ["accesso", accesso.render()];
  } else [nome, contenuto] = ["app", guscio()];

  const attivo = document.activeElement;
  const chiave = attivo?.dataset?.input ? `[data-input="${attivo.dataset.input}"]${attivo.dataset.campo ? `[data-campo="${attivo.dataset.campo}"]` : ""}` : null;
  const selezione = chiave ? [attivo.selectionStart, attivo.selectionEnd] : null;

  app.dataset.vista = nome;
  app.innerHTML = String(contenuto);

  if (chiave) {
    const el = app.querySelector(chiave);
    if (el) {
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(...selezione); } catch { /* campi senza selezione */ }
    }
  }
  if (nome === "app") idrataFoto(app);
}

// ───────────────────────────────────────── azioni
const prossimamente = () => toast("Questa parte arriva nella prossima versione.");
let modoFoto = "nuovo";

const AZIONI = {
  ...armadio.azioni,
  ...filtri.azioni,
  ...editor.azioni,
  ...capo.azioni,
  "aggiungi-capo": () => { modoFoto = "nuovo"; sceltaFoto.click(); },
  "scegli-foto": () => { modoFoto = "cambia"; sceltaFoto.click(); },
  "nuovo-outfit": prossimamente,
  account: () => apriFoglio(account.render(stato)),
  "chiudi-foglio": chiudiFoglio,
  riprova: () => caricaTutto(),
  esci: async () => {
    chiudiFoglio();
    await esci();
  },
};

const INPUT = { ...armadio.input, ...editor.input };

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-azione]");
  if (!el || el.disabled) return;
  const azione = AZIONI[el.dataset.azione];
  if (!azione) return;
  e.preventDefault();
  azione(el, e);
});

document.addEventListener("input", (e) => {
  const f = INPUT[e.target.dataset?.input];
  if (f) f(e.target);
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "form-accesso") accesso.invia(e.target);
});

sceltaFoto.addEventListener("change", () => {
  const file = sceltaFoto.files?.[0];
  sceltaFoto.value = ""; // così si può scegliere di nuovo lo stesso file
  if (!file) return;
  if (modoFoto === "cambia") editor.cambiaFoto(file);
  else {
    editor.nuovaBozza(file);
    vai("nuovo");
  }
});

let rottaPrecedente = rotta();
window.addEventListener("hashchange", () => {
  normalizza();
  const r = rotta();
  // Uscendo dal form senza salvare la bozza si butta: rientrando si riparte dal capo com'è.
  if (inEditor(rottaPrecedente) && (!inEditor(r) || r.param[0] !== rottaPrecedente.param[0] || r.nome !== rottaPrecedente.nome)) {
    editor.abbandona();
  }
  rottaPrecedente = r;
  chiudiFoglio();
  disegna();
  window.scrollTo(0, 0);
  document.querySelector("#vista h1")?.focus({ preventScroll: true });
});

// ───────────────────────────────────────── avvio
async function avvia() {
  normalizza();
  rottaPrecedente = rotta();
  preparaFoglio();
  ascolta(disegna);
  if (!configurato) return disegna();

  const { data } = await sb.auth.getSession();
  aggiorna({ pronto: true, sessione: data.session });
  if (data.session) caricaTutto();

  sb.auth.onAuthStateChange((_evento, sessione) => {
    const prima = stato.sessione?.user?.id;
    const dopo = sessione?.user?.id;
    // Fuori dal callback: supabase-js sconsiglia di chiamare altre API mentre notifica l'evento.
    setTimeout(() => {
      aggiorna({ sessione });
      if (!dopo) azzeraDati();
      else if (dopo !== prima) caricaTutto();
    }, 0);
  });
}

avvia();
