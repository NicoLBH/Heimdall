/**
 * Un enchaînement d'étapes, en boîtes reliées.
 *
 * ## Pourquoi un composant, et pas deux dessins
 *
 * Le chemin d'une exécution — décision, corpus, lecture, avis, suivi — se lisait
 * d'un coup d'œil dans l'écran des Actions. La chaîne d'une variante — la valeur
 * essayée, les utilitaires rejoués, les fonctions natives refaites — se lisait
 * comme une liste, et c'est exactement ce qui a fait qu'un enchaînement pourtant
 * correct a été lu de travers : rien ne disait que la troisième ligne découlait
 * de la deuxième.
 *
 * Les deux montrent la même chose, un enchaînement. Les dessiner deux fois
 * donnerait deux gris, deux rayons de coin et deux flèches, et le jour où l'un
 * change l'autre ne suit pas (règle 4). Il y a donc un seul dessin, et il tourne
 * dans les deux sens.
 *
 * ## Ce qu'une étape porte
 *
 * ```js
 * { id, label, detail, tone, icon, duration, entrees: [], sorties: [] }
 * ```
 *
 * `entrees` et `sorties` sont ce qu'une étape **lit** et ce qu'elle **écrit** :
 * sans elles, on voit une suite de boîtes sans voir pourquoi elles se suivent.
 * Elles sont facultatives — le chemin d'une exécution n'en a pas — et une étape
 * qui n'en déclare pas n'affiche pas de rubrique vide.
 *
 * ## Ce que le composant ne décide pas
 *
 * Ni la couleur d'un ton, ni ce qui est cliquable. Le ton est **donné** par
 * l'appelant, qui sait ce qu'il montre ; et un titre n'est un bouton que si
 * l'appelant nomme l'attribut qui l'écoute. Rendre cliquable un titre qui
 * n'ouvre rien, ce serait promettre un détail qu'on n'a pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les deux sens de lecture. Un enchaînement se lit toujours dans l'un des deux. */
export const SENS = { HORIZONTAL: "horizontal", VERTICAL: "vertical" };

/** Ce qu'une étape lit, ou ce qu'elle écrit. Rien quand elle ne le déclare pas. */
function renderFlux(titre, noms = []) {
  const dits = (Array.isArray(noms) ? noms : []).map(texte).filter(Boolean);
  if (!dits.length) return "";

  return `
    <span class="run-graph__flux">
      <i>${escapeHtml(titre)}</i>
      <span>${dits.map((nom) => escapeHtml(nom)).join(" · ")}</span>
    </span>
  `;
}

/**
 * Une étape : son icône, son titre, ce qu'elle lit, ce qu'elle écrit.
 *
 * Le titre devient un bouton quand l'appelant a nommé un attribut **et** que
 * l'étape est déclarée consultable. Les deux conditions, parce qu'un écran peut
 * avoir des étapes qui s'ouvrent et d'autres qui n'ont rien enregistré.
 */
function renderEtape(noeud, { attributDuLien = "", consultables = null } = {}) {
  const id = texte(noeud?.id);
  const ouvrable = Boolean(attributDuLien) && (consultables ? consultables.has(id) : true);

  return `
    <div class="run-graph__node run-graph__node--${escapeHtml(texte(noeud?.tone) || "neutral")}">
      <span class="run-graph__head">
        <span class="run-graph__icon">${svgIcon(texte(noeud?.icon) || "dot-fill-pending", { className: "octicon" })}</span>
        ${
          ouvrable
            ? `<button type="button" class="run-graph__label run-graph__label--lien"
                 ${attributDuLien}="${escapeHtml(id)}">${escapeHtml(texte(noeud?.label))}</button>`
            : `<span class="run-graph__label"${
                consultables && attributDuLien
                  ? ` title="Aucun détail n'a été enregistré pour cette étape."`
                  : ""
              }>${escapeHtml(texte(noeud?.label))}</span>`
        }
      </span>
      ${texte(noeud?.detail) ? `<span class="run-graph__detail">${escapeHtml(texte(noeud.detail))}</span>` : ""}
      ${renderFlux("lit", noeud?.entrees)}
      ${renderFlux("écrit", noeud?.sorties)}
      ${
        noeud?.duration === null || noeud?.duration === undefined
          ? ""
          : `<span class="run-graph__duration">${escapeHtml(texte(noeud.duree ?? noeud.duration))}</span>`
      }
    </div>
  `;
}

/**
 * L'enchaînement entier, boîtes et liaisons.
 *
 * @param {object[]} noeuds les étapes, dans l'ordre où elles se sont suivies
 * @param {object} options
 * @param {string} [options.sens] `SENS.HORIZONTAL` par défaut
 * @param {string} [options.attributDuLien] l'attribut du bouton, quand un titre s'ouvre
 * @param {Set<string>} [options.consultables] les étapes qui ont quelque chose à ouvrir
 * @param {string} [options.attributDuCanevas] posé sur le canevas, pour le zoom
 */
export function renderEnchainement(noeuds = [], {
  sens = SENS.HORIZONTAL, attributDuLien = "", consultables = null, attributDuCanevas = ""
} = {}) {
  const etapes = Array.isArray(noeuds) ? noeuds.filter(Boolean) : [];
  if (!etapes.length) return "";

  const vertical = sens === SENS.VERTICAL;

  return `
    <div class="run-graph__canvas${vertical ? " run-graph__canvas--vertical" : ""}"${
      attributDuCanevas ? ` ${attributDuCanevas}` : ""
    }>
      ${etapes.map((noeud, rang) => `
        ${rang > 0 ? `<span class="run-graph__link" aria-hidden="true"></span>` : ""}
        ${renderEtape(noeud, { attributDuLien, consultables })}
      `).join("")}
    </div>
  `;
}
