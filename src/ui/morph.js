// Aggiorna il DOM esistente verso il nuovo HTML toccando solo quello che cambia.
// I nodi restano gli stessi, quindi le transizioni CSS partono (un chip che si incassa, l'indicatore della
// tab bar che scorre), i campi non perdono fuoco né cursore e le foto già caricate non lampeggiano.
//
// Regole:
// - i figli con data-key (o id) si abbinano per chiave: una chiave nuova crea un nodo nuovo, che può animarsi
//   all'ingresso; gli altri si abbinano in ordine
// - gli attributi data-js-* sono stato di runtime (premuto, caricata…) e il nuovo HTML non li cancella
// - <img> tiene il src già assegnato se il percorso della foto (data-foto) non è cambiato
// - <details> tiene aperto/chiuso come l'ha lasciato chi tocca
// - un campo con il fuoco tiene il suo valore
// - un elemento aggiunto in un contenitore che c'era già riceve data-js-nuovo: il CSS può animarne
//   l'ingresso (una tessera che compare dopo un filtro) senza far ripartire gli elementi rimasti
// - i figli di un elemento con data-morph-ignora li gestisce qualcun altro (il tavolo degli outfit): non si toccano

export function morph(radice, nuovoHtml) {
  const t = document.createElement("template");
  t.innerHTML = String(nuovoHtml);
  aggiornaFigli(radice, t.content);
}

const chiave = (n) => (n.nodeType === 1 ? n.getAttribute("data-key") || (n.id ? `#${n.id}` : null) : null);

const stessoTipo = (a, b) =>
  a.nodeType === b.nodeType &&
  (a.nodeType !== 1 || (a.tagName === b.tagName && (a.tagName !== "INPUT" || a.type === b.type)));

function aggiornaFigli(vecchio, nuovo) {
  const vecchi = [...vecchio.childNodes];
  const perChiave = new Map();
  const liberi = [];
  for (const n of vecchi) {
    const k = chiave(n);
    if (k) perChiave.set(k, n);
    else liberi.push(n);
  }

  const usati = new Set();
  const finali = [];
  let prossimoLibero = 0;
  for (const n of [...nuovo.childNodes]) {
    const k = chiave(n);
    let abbinato = null;
    if (k) {
      const c = perChiave.get(k);
      if (c && stessoTipo(c, n)) abbinato = c;
    } else {
      const c = liberi[prossimoLibero];
      if (c && stessoTipo(c, n)) {
        abbinato = c;
        prossimoLibero++;
      }
    }
    if (abbinato) {
      usati.add(abbinato);
      aggiornaNodo(abbinato, n);
      finali.push(abbinato);
    } else {
      if (n.nodeType === 1 && vecchio.isConnected) n.setAttribute("data-js-nuovo", "");
      finali.push(n);
    }
  }

  for (const n of vecchi) if (!usati.has(n)) n.remove();
  finali.forEach((n, i) => {
    const attuale = vecchio.childNodes[i];
    if (attuale !== n) vecchio.insertBefore(n, attuale || null);
  });
}

function aggiornaNodo(a, b) {
  if (a.nodeType !== 1) {
    if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return;
  }
  aggiornaAttributi(a, b);

  const tag = a.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    if (document.activeElement !== a && a.value !== b.value) a.value = b.value;
    if (tag === "INPUT" && a.checked !== b.checked) a.checked = b.checked;
    if (tag !== "SELECT") return; // il testo di una textarea è il suo valore, già sistemato
  }
  if (a.hasAttribute("data-morph-ignora")) return;
  aggiornaFigli(a, b);
}

function aggiornaAttributi(a, b) {
  const tag = a.tagName;
  for (const { name, value } of [...b.attributes]) {
    if (a.getAttribute(name) !== value) {
      if (tag === "IMG" && name === "src") a.removeAttribute("data-js-caricata");
      a.setAttribute(name, value);
    }
  }
  for (const { name } of [...a.attributes]) {
    if (b.hasAttribute(name) || name.startsWith("data-js-")) continue;
    if (tag === "IMG" && name === "src" && a.dataset.foto && a.dataset.foto === b.dataset.foto) continue;
    if (tag === "DETAILS" && name === "open") continue;
    a.removeAttribute(name);
  }
}
