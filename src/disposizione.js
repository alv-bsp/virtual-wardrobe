// Disposizione dei capi come flat lay: la usano il tavolo (dove poi li sposti a mano) e le viste degli outfit
// (elenco, scheda, righe nella scheda di un capo), così un outfit ha lo stesso aspetto ovunque.
// La posa di partenza ha un filo di disordine (posizione e rotazione), ma deterministico: dipende solo dal capo,
// quindi a ogni ridisegno è identica, e la scheda dell'outfit coincide con il tavolo da cui l'hai salvato
// (finché non sposti i capi a mano: le pose spostate non si salvano).

import { SLOT, slotDi } from "./outfit.js";

// Centro (frazioni di larghezza e altezza del piano), larghezza (frazione dell'unità U), proporzioni
// della carta (altezza/larghezza). Gli angoli in basso restano liberi per il cestino e il dado del tavolo.
export const POSTI = {
  giacca:    { x: .27, y: .27, w: .38, a: 1.25 },
  sopra:     { x: .60, y: .24, w: .38, a: 1.25 },
  maglia:    { x: .80, y: .41, w: .30, a: 1.25 },
  sotto:     { x: .50, y: .61, w: .34, a: 1.25 },
  scarpe:    { x: .40, y: .86, w: .28, a: 1 },
  accessori: { x: .16, y: .63, w: .22, a: 1 },
};

/** Unità delle misure: la larghezza del piano, ma su un piano basso e largo si stringe. */
export const unita = (w, h) => Math.min(w, h * 0.78);

const ORDINE = SLOT.map((s) => s.id);
const limita = (v, a, b) => Math.min(b, Math.max(a, v));

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Numeri pseudo-casuali ripetibili (mulberry32). */
function generatore(seme) {
  let a = seme;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Posa di partenza di un capo nel suo strato. k > 0 per il secondo, terzo… capo dello stesso strato:
 * si accosta al primo invece di coprirlo.
 * @returns {{ x: number, y: number, w: number, a: number, s: number, r: number, z: number }}
 */
export function posaPredefinita(capoId, strato, k = 0) {
  const p = POSTI[strato] || POSTI.accessori;
  const caso = generatore(hash(capoId));
  return {
    x: limita(p.x + (caso() - 0.5) * 0.04 + k * 0.13, 0.1, 0.9),
    y: limita(p.y + (caso() - 0.5) * 0.03 + k * 0.05, 0.1, 0.9),
    w: p.w,
    a: p.a,
    s: 1,
    r: (caso() - 0.5) * 12,
    z: ORDINE.indexOf(strato) + 1 + k * 10,
  };
}

/** Tutti i capi di un outfit con strato e posa, nell'ordine in cui si sovrappongono. */
export function disponi(capi) {
  const perStrato = new Map();
  return capi
    .map((c) => {
      const strato = slotDi(c);
      const k = perStrato.get(strato) || 0;
      perStrato.set(strato, k + 1);
      return { capo: c, strato, posa: posaPredefinita(c.id, strato, k) };
    })
    .sort((a, b) => a.posa.z - b.posa.z);
}
