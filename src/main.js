import "./stile/tokens.css";
import "./stile/base.css";
import "./stile/componenti.css";

import { configurato } from "./config.js";
import { sb } from "./supabase.js";
import { stato, aggiorna, ascolta, azzeraDati } from "./stato.js";
import { caricaTutto } from "./dati.js";
import { esci } from "./accesso.js";
import { rotta, normalizza, SEZIONI } from "./router.js";
import { html } from "./ui/html.js";
import { icona } from "./ui/icone.js";
import { toast, apriFoglio, chiudiFoglio, preparaFoglio } from "./ui/avvisi.js";
import { avviso } from "./viste/comuni.js";
import * as armadio from "./viste/armadio.js";
import * as outfit from "./viste/outfit.js";
import * as manca from "./viste/manca.js";
import * as accesso from "./viste/accesso.js";
import * as account from "./viste/account.js";

const VISTE = { armadio, outfit, manca };
const TAB = {
  armadio: { etichetta: "Armadio", icona: "shirt" },
  outfit: { etichetta: "Outfit", icona: "layers" },
  manca: { etichetta: "Cosa manca", icona: "pie" },
};
const app = document.getElementById("app");

// ───────────────────────────────────────── disegno
function guscio() {
  const r = rotta();
  const v = VISTE[r.nome];
  document.title = v.titolo === "Armadio" ? "Armadio" : `${v.titolo} · Armadio`;
  return html`
    <main class="vista" id="vista">
      ${v.render(stato, { rotta: r, avviso: stato.errore ? avviso(stato.errore) : "" })}
    </main>
    <div class="velo" aria-hidden="true"></div>
    ${v.fab(stato)}
    <nav class="tabbar" aria-label="Sezioni">
      ${SEZIONI.map((nome) => html`
        <a class="tab" href="#/${nome}" ${r.nome === nome ? html`aria-current="page"` : ""}>
          ${icona(TAB[nome].icona, 22)}<span>${TAB[nome].etichetta}</span>
        </a>`)}
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

/** Ridisegna la vista giusta. La pagina di accesso non si ridisegna da sola, per non perdere quello che stai scrivendo. */
function disegna() {
  let nome, contenuto;
  if (!configurato) [nome, contenuto] = ["config", senzaConfigurazione()];
  else if (!stato.pronto) [nome, contenuto] = ["attesa", ""];
  else if (!stato.sessione) {
    if (app.dataset.vista === "accesso") return;
    [nome, contenuto] = ["accesso", accesso.render()];
  } else [nome, contenuto] = ["app", guscio()];
  app.dataset.vista = nome;
  app.innerHTML = String(contenuto);
}

// ───────────────────────────────────────── azioni
const prossimamente = () => toast("Questa parte arriva nella prossima versione.");

const AZIONI = {
  "aggiungi-capo": prossimamente,
  "nuovo-outfit": prossimamente,
  account: () => apriFoglio(account.render(stato)),
  "chiudi-foglio": chiudiFoglio,
  riprova: () => caricaTutto(),
  esci: async () => {
    chiudiFoglio();
    await esci();
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-azione]");
  if (!el || el.disabled) return;
  const azione = AZIONI[el.dataset.azione];
  if (!azione) return;
  e.preventDefault();
  azione(el, e);
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "form-accesso") return;
  e.preventDefault();
  accesso.invia(e.target);
});

window.addEventListener("hashchange", () => {
  normalizza();
  disegna();
  window.scrollTo(0, 0);
  document.querySelector("#vista h1")?.focus({ preventScroll: true });
});

// ───────────────────────────────────────── avvio
async function avvia() {
  normalizza();
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
