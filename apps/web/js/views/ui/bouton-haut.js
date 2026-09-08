/**
 * Revenir en haut.
 *
 * ## Pourquoi un bouton, alors que la molette existe
 *
 * Un fichier de mémoire fait trois cents lignes, un diff en fait mille. Quand
 * on est descendu jusqu'au bout, le fil d'Ariane s'est collé en haut de
 * l'écran — il dit **où** l'on est, mais il ne ramène pas d'où l'on vient. Le
 * geste manquant se faisait à la molette, sur dix secondes, et l'on dépassait.
 *
 * Le bouton ne paraît donc **que collé** : déroulé, le haut est déjà là, et un
 * bouton qui ne mène nulle part est du bruit.
 *
 * ## Discret, et pas invisible
 *
 * Ni fond ni bordure au repos : la barre porte déjà un chemin, une recherche et
 * parfois des gestes, et un cadre de plus la ferait lire comme une barre
 * d'outils. Au survol seulement, un fond arrondi dit que c'est cliquable.
 *
 * C'est la même règle pour les boutons qui replient la barre latérale — dans
 * les Fichiers, dans une proposition, dans l'Atelier. Ils commandaient tous le
 * même geste avec trois habillages : un fond gris permanent ici, une bordure
 * là, rien ailleurs. La classe `.bouton-discret` les tient ensemble.
 */

import { svgIcon } from "../../ui/icons.js";

/** Le bouton, dessiné. Il se cache tout seul tant que rien n'est collé. */
export function renderBoutonHaut({ className = "" } = {}) {
  return `
    <button type="button" class="bouton-discret bouton-haut${className ? ` ${className}` : ""}"
      data-remonter-en-haut
      title="Revenir en haut" aria-label="Revenir en haut">
      ${svgIcon("arrow-up", { className: "octicon octicon-arrow-up" })}<span>Haut</span>
    </button>
  `;
}

/**
 * Ramener en haut ce qui défile.
 *
 * ## Ce qui défile n'est pas toujours la page
 *
 * En lecture de PDF, en plein écran, dans un panneau à ascenseur propre, la
 * fenêtre ne bouge pas d'un pixel : c'est un conteneur qui défile. Un bouton
 * qui ne remonterait que la fenêtre ne ferait rien du tout là où on en a le
 * plus besoin — au bas d'un document de trois cents lignes.
 *
 * On remonte donc la fenêtre **et** les conteneurs qui portent le bouton. Ceux
 * qui étaient déjà en haut ne bougent pas, et les remettre à zéro ne coûte
 * rien.
 *
 * @param {object} options
 * @param {Element} [options.depuis] le bouton cliqué — on remonte ses ancêtres
 * @param {Element} [options.scrollEl] un conteneur nommé par l'appelant
 */
export function remonterEnHaut({ depuis = null, scrollEl = null } = {}) {
  const doux = { top: 0, left: 0, behavior: "smooth" };
  const cibles = [scrollEl, ...ancetresQuiDefilent(depuis), document.scrollingElement,
    document.documentElement, document.body];

  for (const cible of cibles) {
    if (!cible || typeof cible.scrollTo !== "function") continue;
    try { cible.scrollTo(doux); } catch { cible.scrollTop = 0; }
  }

  try { window.scrollTo(doux); } catch { window.scrollTo(0, 0); }
}

/** Les conteneurs qui, entre le bouton et la racine, portent un ascenseur. */
function ancetresQuiDefilent(depuis) {
  const trouves = [];
  for (let noeud = depuis?.parentElement; noeud; noeud = noeud.parentElement) {
    if (noeud.scrollTop <= 0) continue;
    const debord = window.getComputedStyle(noeud).overflowY;
    if (debord === "auto" || debord === "scroll" || debord === "overlay") trouves.push(noeud);
  }
  return trouves;
}

/**
 * Brancher les boutons d'un écran.
 *
 * Par délégation sur la racine : la barre se redessine à chaque navigation, et
 * un écouteur posé sur le bouton lui-même partirait avec lui.
 */
export function brancherLeBoutonHaut(root, { scrollEl = null } = {}) {
  if (!root || root.dataset.hautBranche === "true") return;
  root.dataset.hautBranche = "true";

  root.addEventListener("click", (evenement) => {
    const bouton = evenement.target?.closest?.("[data-remonter-en-haut]");
    if (!bouton || !root.contains(bouton)) return;
    evenement.preventDefault();
    remonterEnHaut({ depuis: bouton, scrollEl: typeof scrollEl === "function" ? scrollEl() : scrollEl });
  });
}
