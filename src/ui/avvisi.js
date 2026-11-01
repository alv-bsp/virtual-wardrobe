// Toast in basso e foglio dal basso (un <dialog> unico in index.html, riempito al bisogno).
let timer = null;

export function toast(testo, durata = 2800) {
  const el = document.getElementById("toast");
  el.textContent = testo;
  el.classList.add("on");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("on"), durata);
}

const foglio = () => document.getElementById("foglio");

export function apriFoglio(contenuto) {
  const d = foglio();
  d.innerHTML = String(contenuto);
  if (!d.open) d.showModal();
}

export function chiudiFoglio() {
  const d = foglio();
  if (d.open) d.close();
}

// Un tocco sullo sfondo scuro chiude il foglio (il click arriva al <dialog> stesso, fuori dal contenuto).
export function preparaFoglio() {
  const d = foglio();
  d.addEventListener("click", (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const fuori = e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right;
    if (fuori) d.close();
  });
  d.addEventListener("close", () => { d.innerHTML = ""; });
}
