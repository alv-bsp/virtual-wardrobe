import "./stile/tokens.css";
import "./stile/base.css";
import "./stile/componenti.css";
import "./stile/movimento.css";
import "./stile/tavolo.css";

import { configurato } from "./config.js";
import { sb } from "./supabase.js";
import { stato, aggiorna, ascolta, azzeraDati } from "./stato.js";
import { caricaTutto } from "./dati.js";
import { idrataFoto } from "./foto.js";
import { esci } from "./accesso.js";
import { rotta, normalizza, vai } from "./router.js";
import { html } from "./ui/html.js";
import { icona } from "./ui/icone.js";
import { apriFoglio, chiudiFoglio, chiudiFoglioSubito, preparaFoglio } from "./ui/avvisi.js";
import { morph } from "./ui/morph.js";
import { preparaTocco, transizione } from "./ui/tocco.js";
import { avviso } from "./viste/comuni.js";
import * as armadio from "./viste/armadio.js";
import * as outfit from "./viste/outfit.js";
import * as capo from "./viste/capo.js";
import * as editor from "./viste/editor.js";
import * as tavolo from "./viste/tavolo.js";
import * as outfitDettaglio from "./viste/outfit-dettaglio.js";
import * as filtri from "./viste/filtri.js";
import * as accesso from "./viste/accesso.js";
import * as account from "./viste/account.js";

const TAB = {
  armadio: { etichetta: "Armadio", icona: "hanger" },
  outfit: { etichetta: "Outfit", icona: "layers" },
};
const app = document.getElementById("app");
const sceltaFoto = document.getElementById("scegli-foto");

function vistaPer(r) {
  if (r.nome === "nuovo") return editor;
  if (r.nome === "capo") return r.param[1] === "modifica" ? editor : capo;
  if (r.nome === "outfit" && r.param[0]) {
    return r.param[0] === "nuovo" || r.param[1] === "modifica" ? tavolo : outfitDettaglio;
  }
  return { armadio, outfit }[r.nome];
}

// ───────────────────────────────────────── disegno
function guscio() {
  const r = rotta();
  const v = vistaPer(r);
  document.title = v.titolo && v.titolo !== "Armadio" ? `${v.titolo} · Armadio` : "Armadio";
  const contenuto = v.render(stato, { rotta: r, avviso: stato.errore ? avviso(stato.errore) : "" });
  // La chiave della vista cambia con la pagina: cambiando pagina il contenuto si ricrea da capo,
  // restando sulla stessa pagina si aggiorna solo quello che cambia. Tab bar e pulsante principale restano.
  const pagina = [r.nome, ...r.param].join("/");
  return html`
    <main class="vista ${v.conTabbar ? "" : "senza-tabbar"} ${v.classeVista || ""}" id="vista" data-key="vista:${pagina}">${contenuto}</main>
    ${v.conTabbar ? barraInBasso(r) : ""}`;
}

// L'azione principale è il disco al centro della barra: in Outfit crea un outfit nuovo (già generato),
// altrove aggiunge un capo.
const CTA = {
  outfit: { azione: "nuovo-outfit", aria: "Nuovo outfit" },
  altro: { azione: "aggiungi-capo", aria: "Aggiungi un capo" },
};

function barraInBasso(r) {
  const cta = CTA[r.sezione] || CTA.altro;
  const tab = (nome) => html`
    <a class="tab" href="#/${nome}" ${r.sezione === nome ? html`aria-current="page"` : ""}>
      ${icona(TAB[nome].icona, 21)}<span>${TAB[nome].etichetta}</span>
    </a>`;
  return html`
    <nav class="tabbar" data-key="tabbar" aria-label="Sezioni">
      <div class="tabbar-tasti">
        ${tab("armadio")}
        <button class="tasto-cta" type="button" data-azione="${cta.azione}" aria-label="${cta.aria}" title="${cta.aria}">
          <span class="incisa">${icona("plus", 26, 2.6)}</span>
        </button>
        ${tab("outfit")}
      </div>
    </nav>`;
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
 * Ridisegna la vista giusta. Dentro l'app aggiorna il DOM invece di rifarlo (morph): i cambi di stato
 * si animano, i campi tengono fuoco e cursore. La pagina di accesso non si ridisegna da sola, per non perdere
 * quello che stai scrivendo.
 */
function disegna() {
  let nome, contenuto;
  if (!configurato) [nome, contenuto] = ["config", senzaConfigurazione()];
  else if (!stato.pronto) [nome, contenuto] = ["attesa", ""];
  else if (!stato.sessione) {
    if (app.dataset.vista === "accesso") return;
    [nome, contenuto] = ["accesso", accesso.render()];
  } else [nome, contenuto] = ["app", guscio()];

  if (nome === "app" && app.dataset.vista === "app") morph(app, contenuto);
  else app.innerHTML = String(contenuto);
  app.dataset.vista = nome;

  if (nome === "app") {
    idrataFoto(app);
    vistaPer(rotta()).monta?.(app); // il tavolo degli outfit si aggancia alla pagina appena disegnata
  }
}

/** Profondità di una pagina: sezioni 0, schede 1, modifiche 2. Decide il verso della transizione. */
function profondita(r) {
  if (!r.param.length && r.nome !== "nuovo") return 0;
  return r.param[1] === "modifica" ? 2 : 1;
}

// ───────────────────────────────────────── azioni
let modoFoto = "nuovo";

const AZIONI = {
  ...armadio.azioni,
  ...filtri.azioni,
  ...editor.azioni,
  ...capo.azioni,
  ...outfit.azioni,
  ...outfitDettaglio.azioni,
  ...tavolo.azioni,
  "aggiungi-capo": () => { modoFoto = "nuovo"; sceltaFoto.click(); },
  "scegli-foto": () => { modoFoto = "cambia"; sceltaFoto.click(); },
  "nuovo-outfit": () => { tavolo.nuovoOutfit(); vai("outfit/nuovo"); },
  "componi-con": (el) => { tavolo.componiCon(el.dataset.id); vai("outfit/nuovo"); },
  account: () => apriFoglio(account.render(stato)),
  "chiudi-foglio": chiudiFoglio,
  riprova: () => caricaTutto(),
  esci: async () => {
    chiudiFoglio();
    await esci();
  },
};

const INPUT = { ...armadio.input, ...editor.input, ...tavolo.input };

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
  // Uscendo da un form senza salvare la bozza si butta: rientrando si riparte da com'era.
  const prima = vistaPer(rottaPrecedente);
  const stessaPagina = prima === vistaPer(r) && r.nome === rottaPrecedente.nome && r.param.join("/") === rottaPrecedente.param.join("/");
  if (prima.abbandona && !stessaPagina) prima.abbandona();
  const verso = profondita(r) > profondita(rottaPrecedente) ? "avanti"
    : profondita(r) < profondita(rottaPrecedente) ? "indietro"
    : profondita(r) === 0 ? "tab" : "avanti";
  rottaPrecedente = r;
  chiudiFoglioSubito();
  transizione(verso, () => {
    disegna();
    window.scrollTo(0, 0);
  });
});

// ───────────────────────────────────────── avvio
async function avvia() {
  normalizza();
  rottaPrecedente = rotta();
  preparaFoglio();
  preparaTocco();
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
