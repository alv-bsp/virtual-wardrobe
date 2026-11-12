// Microinterazioni: la pressione sui comandi, la dissolvenza delle foto, le piccole animazioni una tantum.
// Tutto rispetta prefers-reduced-motion: con il movimento ridotto restano solo i cambi di stato, senza animazione.

export const movimentoRidotto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Elementi che "affondano" quando li tocchi. Lo stato sta in data-js-premuto, che il ridisegno non cancella.
const PREMIBILI = ".btn, .chip, .icona-btn, .tab, .tasto-cta, .tondo-foto, .tessera, .tessera-outfit, .slot-scelta, .riga-outfit, .indietro, .link, .scelta-capo, .foto.vuota, a.flatlay-carta";
const DURATA_MINIMA = 120; // ms: anche un tocco velocissimo si vede

/** Indirizzi delle foto già arrivate: ridisegnandole (es. tornando ad Armadio) si mostrano subito, senza dissolvenza. */
export const fotoArrivate = new Set();

export function preparaTocco() {
  document.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const el = e.target.closest(PREMIBILI);
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
    el.setAttribute("data-js-premuto", "");
    const inizio = performance.now();
    const rilascia = () => {
      window.removeEventListener("pointerup", rilascia, true);
      window.removeEventListener("pointercancel", rilascia, true);
      const resto = Math.max(0, DURATA_MINIMA - (performance.now() - inizio));
      setTimeout(() => el.removeAttribute("data-js-premuto"), resto);
    };
    window.addEventListener("pointerup", rilascia, true);
    window.addEventListener("pointercancel", rilascia, true);
  }, { passive: true });

  // Le foto entrano in dissolvenza appena arrivano, invece di comparire di colpo.
  document.addEventListener("load", (e) => {
    if (e.target.tagName !== "IMG") return;
    e.target.setAttribute("data-js-caricata", "");
    fotoArrivate.add(e.target.getAttribute("src"));
  }, true);
  document.addEventListener("error", (e) => {
    if (e.target.tagName === "IMG") e.target.closest(".foto")?.setAttribute("data-js-errore", "");
  }, true);
}

/** Animazione una tantum con le Web Animations, saltata se il movimento è ridotto. */
export function anima(el, fotogrammi, opzioni) {
  if (!el || movimentoRidotto() || !el.animate) return null;
  return el.animate(fotogrammi, { easing: "cubic-bezier(.2, .7, .3, 1)", ...opzioni });
}

/**
 * Cambio di schermata con le View Transitions, se il browser le ha (Safari 18+, Chrome):
 * avanti scorre da destra, indietro da sinistra, tra le tab dissolve. Altrimenti cambia e basta.
 */
export function transizione(direzione, aggiorna) {
  if (!document.startViewTransition || movimentoRidotto()) {
    aggiorna();
    return;
  }
  document.documentElement.dataset.direzione = direzione;
  const t = document.startViewTransition(aggiorna);
  t.ready.catch(() => {}); // una transizione interrotta da un'altra non è un errore
  t.finished.catch(() => {}).finally(() => delete document.documentElement.dataset.direzione);
}
