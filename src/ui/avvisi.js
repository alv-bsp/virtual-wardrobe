import { morph } from "./morph.js";
import { movimentoRidotto } from "./tocco.js";

// Toast in basso e foglio dal basso (un <dialog> unico in index.html, riempito al bisogno).
let timer = null;

export function toast(testo, durata = 2800) {
  const el = document.getElementById("toast");
  el.textContent = testo;
  el.classList.remove("on");
  void el.offsetWidth; // riparte l'animazione anche se il toast era già visibile
  el.classList.add("on");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("on"), durata);
}

const foglio = () => document.getElementById("foglio");
let chiusura = null;

/** Apre il foglio, o ne aggiorna il contenuto senza ricrearlo se è già aperto (così i chip si animano). */
export function apriFoglio(contenuto) {
  const d = foglio();
  if (chiusura) {
    clearTimeout(chiusura);
    chiusura = null;
    d.removeAttribute("data-js-chiude");
  }
  if (d.open) {
    morph(d, contenuto);
    return;
  }
  d.innerHTML = String(contenuto);
  d.showModal();
}

/** Chiude subito, senza animazione: quando si cambia schermata ci pensa la transizione della pagina. */
export function chiudiFoglioSubito() {
  const d = foglio();
  clearTimeout(chiusura);
  chiusura = null;
  d.removeAttribute("data-js-chiude");
  if (d.open) d.close();
}

/** Chiude il foglio facendolo scendere; con il movimento ridotto si chiude subito. */
export function chiudiFoglio() {
  const d = foglio();
  if (!d.open || chiusura) return;
  if (movimentoRidotto()) return d.close();
  d.setAttribute("data-js-chiude", "");
  chiusura = setTimeout(() => {
    chiusura = null;
    d.removeAttribute("data-js-chiude");
    d.close();
  }, 200);
}

// Un tocco sullo sfondo scuro chiude il foglio (il click arriva al <dialog> stesso, fuori dal contenuto).
// Esc lo chiude con la stessa animazione.
export function preparaFoglio() {
  const d = foglio();
  d.addEventListener("click", (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const fuori = e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right;
    if (fuori) chiudiFoglio();
  });
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    chiudiFoglio();
  });
  d.addEventListener("close", () => { d.innerHTML = ""; });
}
