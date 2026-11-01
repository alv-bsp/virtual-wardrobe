import { nomeVoce } from "./voci.js";

// Filtri dell'armadio. Di base si vedono i capi che possiedi: nell'armadio e da dismettere.
export const STATI_BASE = ["armadio", "dismettere"];

export const filtriVuoti = () => ({
  categoria: null, // una sola categoria, o tutte
  colori: [],      // il colore principale o uno dei secondari
  stagioni: [],
  occasioni: [],
  stati: [...STATI_BASE],
  testo: "",
});

const normalizza = (s) => (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const interseca = (a, b) => !b.length || a.some((x) => b.includes(x));

export function filtra(capi, f) {
  const testo = normalizza(f.testo);
  return capi.filter((c) =>
    f.stati.includes(c.stato) &&
    (!f.categoria || c.categoria === f.categoria) &&
    interseca([c.colore, ...c.colori_secondari], f.colori) &&
    interseca(c.stagioni, f.stagioni) &&
    interseca(c.occasioni, f.occasioni) &&
    (!testo || normalizza(`${c.nome} ${c.marca} ${nomeVoce("categoria", c.categoria)}`).includes(testo)),
  );
}

/** Quanti gruppi del foglio Filtri sono diversi dal default (la categoria ha i suoi chip, la ricerca il suo campo). */
export function contaAttivi(f) {
  const statiDiversi = f.stati.length !== STATI_BASE.length || !STATI_BASE.every((s) => f.stati.includes(s));
  return [f.colori.length, f.stagioni.length, f.occasioni.length, statiDiversi].filter(Boolean).length;
}

export function alterna(lista, valore) {
  return lista.includes(valore) ? lista.filter((v) => v !== valore) : [...lista, valore];
}
