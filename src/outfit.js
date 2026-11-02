// Logica degli outfit, senza interfaccia: strati, stagione, regole del generatore.
// Un outfit nel database è solo un insieme di capi; lo strato di ogni capo si ricava dalla sua categoria.

export const SLOT = [
  { id: "giacca", nome: "Giacca", categorie: ["giacche"] },
  { id: "maglia", nome: "Maglia", categorie: ["maglieria", "felpe"] },
  { id: "sopra", nome: "Sopra", categorie: ["camicie", "tshirt", "sport"] },
  { id: "sotto", nome: "Sotto", categorie: ["pantaloni", "jeans", "pantaloncini"] },
  { id: "scarpe", nome: "Scarpe", categorie: ["scarpe"] },
  { id: "accessori", nome: "Accessori", categorie: ["accessori"] },
];

/** Strato di un capo; le categorie nuove, non ancora mappate, finiscono negli accessori. */
export const slotDi = (capo) => (SLOT.find((s) => s.categorie.includes(capo.categoria)) || SLOT[SLOT.length - 1]).id;

const ORDINE_STAGIONI = ["estate", "primavera", "autunno", "inverno"]; // dal caldo al freddo

export function stagioneCorrente(data = new Date()) {
  const m = data.getMonth();
  if (m <= 1 || m === 11) return "inverno";
  if (m <= 4) return "primavera";
  if (m <= 7) return "estate";
  return "autunno";
}

/**
 * Probabilità di mettere giacca e maglia, secondo la stagione più fredda scelta.
 * Sopra, sotto e scarpe ci sono sempre; gli accessori li aggiungi tu.
 */
function probabilita(stagioni) {
  const scelte = stagioni.length ? stagioni : [stagioneCorrente()];
  const freddo = Math.max(...scelte.map((s) => ORDINE_STAGIONI.indexOf(s)));
  return [
    { giacca: 0, maglia: 0 },
    { giacca: 0.3, maglia: 0.4 },
    { giacca: 0.6, maglia: 0.6 },
    { giacca: 1, maglia: 1 },
  ][Math.max(0, freddo)];
}

// ───────────────────────────── colori
// I neutri stanno con tutto. Gli altri sono accenti: al massimo uno per outfit (ripetuto va bene, fantasia no).
const NEUTRI = new Set(["nero", "grigio", "bianco", "panna", "beige", "cammello", "marrone", "blu-navy"]);
export const neutro = (c) => NEUTRI.has(c.colore) || (c.colore === "blu" && c.categoria === "jeans");

export function compatibile(scelti, candidato) {
  if (neutro(candidato)) return true;
  const accenti = scelti.filter((c) => !neutro(c)).map((c) => c.colore);
  if (!accenti.length) return true;
  return candidato.colore !== "fantasia" && accenti.every((a) => a === candidato.colore);
}

// ───────────────────────────── idoneità
const vaBene = (lista, scelte) => !scelte.length || !lista.length || lista.some((x) => scelte.includes(x));

/** Capi che il generatore può usare: nell'armadio (non wishlist né da dismettere), giusti per stagione e occasione. */
export const idoneo = (c, { stagioni, occasioni }) =>
  c.stato === "armadio" && vaBene(c.stagioni, stagioni) && vaBene(c.occasioni, occasioni);

export const chiaveCapi = (ids) => [...ids].filter(Boolean).sort().join(",");

function pesca(candidati, pesi) {
  const totale = candidati.reduce((s, c) => s + pesi(c), 0);
  let r = Math.random() * totale;
  for (const c of candidati) {
    r -= pesi(c);
    if (r <= 0) return c;
  }
  return candidati[candidati.length - 1];
}

/**
 * Riempie gli slot non bloccati. Ordine: prima sotto e scarpe, poi gli strati sopra, così l'accento
 * (se c'è) tende a cadere su un capo solo. I capi usati in meno outfit hanno più probabilità di uscire.
 *
 * @param {object} p
 * @param {Record<string,string|null>} p.slot      capo scelto per ogni slot (id) — quelli bloccati restano
 * @param {Set<string>} p.bloccati                 slot da non toccare
 * @param {string[]} p.stagioni
 * @param {string[]} p.occasioni
 * @param {object[]} p.capi                        tutti i capi
 * @param {Map<string,number>} p.usi               quante volte ogni capo compare negli outfit salvati
 * @param {Set<string>} p.daEvitare                chiavi di combinazioni già viste o salvate
 * @returns {Record<string,string|null>}
 */
export function genera({ slot, bloccati, stagioni, occasioni, capi, usi = new Map(), daEvitare = new Set() }) {
  const perId = new Map(capi.map((c) => [c.id, c]));
  const prob = probabilita(stagioni);
  const ordine = ["sotto", "scarpe", "sopra", "maglia", "giacca", "accessori"];
  let migliore = null;

  for (let tentativo = 0; tentativo < 8; tentativo++) {
    const nuovo = {};
    const scelti = [];
    for (const id of ordine) {
      if (bloccati.has(id)) {
        nuovo[id] = slot[id] ?? null;
        if (perId.has(nuovo[id])) scelti.push(perId.get(nuovo[id]));
      }
    }
    for (const id of ordine) {
      if (bloccati.has(id)) continue;
      nuovo[id] = null;
      const p = prob[id] ?? (id === "accessori" ? 0 : 1);
      if (Math.random() >= p) continue;
      const def = SLOT.find((s) => s.id === id);
      const adatti = capi.filter((c) => def.categorie.includes(c.categoria) && idoneo(c, { stagioni, occasioni }));
      const intonati = adatti.filter((c) => compatibile(scelti, c));
      const candidati = intonati.length ? intonati : adatti;
      if (!candidati.length) continue;
      const c = pesca(candidati, (x) => 1 / (1 + (usi.get(x.id) || 0)));
      nuovo[id] = c.id;
      scelti.push(c);
    }
    migliore = nuovo;
    if (!daEvitare.has(chiaveCapi(Object.values(nuovo)))) break;
  }
  return migliore;
}

/** Mette ogni capo dell'outfit nel suo slot (se due capi cadono nello stesso slot, il secondo va negli accessori). */
export function slotDaCapi(capiOutfit) {
  const slot = Object.fromEntries(SLOT.map((s) => [s.id, null]));
  const extra = [];
  for (const c of capiOutfit) {
    const id = slotDi(c);
    if (!slot[id]) slot[id] = c.id;
    else extra.push(c.id);
  }
  if (extra.length && !slot.accessori) slot.accessori = extra.shift();
  return { slot, extra };
}
