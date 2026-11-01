import { stato } from "./stato.js";

// Le liste predefinite (tabella voci) lette dopo il login. Qui solo funzioni di comodo.
export const STATI = [
  { slug: "armadio", nome: "Nell'armadio" },
  { slug: "wishlist", nome: "Wishlist" },
  { slug: "dismettere", nome: "Da dismettere" },
];

/** Voci di una lista in ordine. Con soloAttive, nasconde quelle tolte (attiva = false) tranne quelle già scelte. */
export function voci(lista, { soloAttive = true, scelte = [] } = {}) {
  return stato.voci
    .filter((v) => v.lista === lista && (!soloAttive || v.attiva || scelte.includes(v.slug)))
    .sort((a, b) => a.ordine - b.ordine);
}

export function nomeVoce(lista, slug) {
  if (lista === "stato") return STATI.find((s) => s.slug === slug)?.nome || slug;
  return stato.voci.find((v) => v.lista === lista && v.slug === slug)?.nome || slug;
}

export const hexColore = (slug) => stato.voci.find((v) => v.lista === "colore" && v.slug === slug)?.hex || null;

/** Nome da mostrare: quello dato o, se manca, "Categoria · Colore". */
export const nomeCapo = (c) => c.nome?.trim() || `${nomeVoce("categoria", c.categoria)} · ${nomeVoce("colore", c.colore)}`;
