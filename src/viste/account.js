import { html } from "../ui/html.js";
import { icona } from "../ui/icone.js";
import { VERSIONE } from "../config.js";

export function render(s) {
  const voci = s.voci.length;
  return html`
    <div class="maniglia" aria-hidden="true"></div>
    <div class="foglio-testa">
      <h2 id="foglio-titolo">Account</h2>
      <button class="icona-btn" type="button" data-azione="chiudi-foglio" aria-label="Chiudi">${icona("x")}</button>
    </div>
    <dl class="righe">
      <div><dt>Email</dt><dd>${s.sessione?.user?.email || ""}</dd></div>
      <div><dt>Liste</dt><dd>${voci ? `${voci} voci` : "non caricate"}</dd></div>
      <div><dt>Versione</dt><dd>${VERSIONE}</dd></div>
    </dl>
    <button class="btn largo" type="button" data-azione="esci">${icona("logout")}Esci</button>`;
}
