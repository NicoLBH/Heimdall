/**
 * Copier dans le presse-papiers.
 *
 * ## Pourquoi un composant, et pas trois lignes à chaque fois
 *
 * Le geste est partout : un chemin de fichier, un fichier de mémoire, un diff,
 * un message du copilote, une référence d'étude. Il tenait en trois lignes, et
 * il a donc été réécrit sept fois — avec sept comportements. Deux d'entre eux
 * montraient une coche verte, un autre une classe `is-done`, quatre ne
 * montraient rien du tout.
 *
 * Or **c'est le retour qui compte**. Une copie silencieuse fait recliquer trois
 * fois sans savoir si elle a eu lieu : le presse-papiers est le seul endroit de
 * l'interface qu'on ne peut pas regarder. La coche verte n'est pas une
 * décoration, c'est la réponse à « est-ce que ça a marché ? ».
 *
 * ## Et quand le presse-papiers refuse
 *
 * Il refuse pour de vraies raisons — page non sécurisée, permission retirée —
 * et il ne faut pas perdre le texte pour autant. On l'affiche dans une invite,
 * où il reste sélectionnable. Un échec silencieux ferait croire à une copie.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texteDe = (valeur) => String(valeur ?? "").trim();

/** Le temps que la coche reste. Assez pour la voir, assez peu pour l'oublier. */
const TEMPS_DE_LA_COCHE = 2000;

const ICONE_COPIER = svgIcon("copy", { className: "octicon octicon-copy" });
const ICONE_COPIE = svgIcon("check", { className: "octicon octicon-check" });

/**
 * Un bouton de copie, dessiné.
 *
 * @param {object} options
 * @param {string} [options.cible] ce qu'on copie, quand l'appelant le résout
 *   lui-même — un identifiant de groupe, un index de message
 * @param {string} [options.texte] le texte à copier, quand on l'a déjà
 * @param {string} [options.className] des classes en plus, pour la mise en page
 * @param {string} [options.titre] l'info-bulle au repos
 * @param {string} [options.titreCopie] celle qui dit que c'est fait
 */
export function renderBoutonCopier({
  cible = "", texte = "", className = "",
  titre = "Copier dans le presse-papiers", titreCopie = "Copié"
} = {}) {
  return `
    <button type="button" class="bouton-copier${className ? ` ${className}` : ""}"
      data-copier="${escapeHtml(cible)}"
      ${texte ? `data-copier-texte="${escapeHtml(texte)}"` : ""}
      data-copier-titre="${escapeHtml(titre)}"
      data-copier-titre-copie="${escapeHtml(titreCopie)}"
      title="${escapeHtml(titre)}" aria-label="${escapeHtml(titre)}">${ICONE_COPIER}</button>
  `;
}

/**
 * Copier, et dire si cela a marché.
 *
 * Le repli n'est pas un échec : une invite garde le texte sélectionnable, ce
 * qui vaut mieux que de le perdre. Elle rend tout de même `false` — l'appelant
 * doit pouvoir distinguer une copie d'un contournement.
 *
 * @returns {Promise<boolean>}
 */
export async function copierDansLePressePapiers(texte, { replier = true } = {}) {
  const dit = String(texte ?? "");
  if (!dit) return false;

  try {
    await navigator.clipboard.writeText(dit);
    return true;
  } catch {
    if (replier) {
      window.prompt("Le presse-papiers a été refusé — copiez le texte ci-dessous.", dit);
    }
    return false;
  }
}

/**
 * La coche verte, puis le retour à l'icône d'origine.
 *
 * Exportée : deux boutons ne se dessinent pas ici — celui du copilote et celui
 * du fil de discussion vivent dans leur écran — et doivent pourtant donner le
 * même retour. Ce qui ne se partage pas se met à diverger.
 */
export function marquerCopie(bouton, { titre = "", titreCopie = "Copié" } = {}) {
  if (!bouton) return;

  const auRepos = titre || bouton.getAttribute("data-copier-titre") || "Copier dans le presse-papiers";
  const fait = bouton.getAttribute("data-copier-titre-copie") || titreCopie;

  window.clearTimeout(Number(bouton.dataset.copierMinuteur || 0));

  bouton.classList.add("is-copied");
  bouton.innerHTML = ICONE_COPIE;
  bouton.setAttribute("title", fait);
  bouton.setAttribute("aria-label", fait);

  bouton.dataset.copierMinuteur = String(window.setTimeout(() => {
    bouton.classList.remove("is-copied");
    bouton.innerHTML = ICONE_COPIER;
    bouton.setAttribute("title", auRepos);
    bouton.setAttribute("aria-label", auRepos);
    delete bouton.dataset.copierMinuteur;
  }, TEMPS_DE_LA_COCHE));
}

/**
 * Brancher tous les boutons de copie d'un écran.
 *
 * Le texte vient de l'attribut quand on l'a sous la main, sinon de `texteDe` —
 * qui reçoit la cible et le bouton, et peut être asynchrone. Un diff de trois
 * cents lignes n'a pas à voyager dans un attribut HTML pour qu'on puisse le
 * copier.
 *
 * @param {Element} root
 * @param {{texteDe?: (cible: string, bouton: Element) => string|Promise<string>}} options
 */
export function brancherLesBoutonsCopier(root, { texteDe: resoudre = null } = {}) {
  if (!root) return;

  for (const bouton of root.querySelectorAll("[data-copier]")) {
    // Un rendu qui repasse sur le même nœud ne doit pas doubler l'écouteur :
    // le texte partirait deux fois, et la coche clignoterait.
    if (bouton.dataset.copierBranche === "true") continue;
    bouton.dataset.copierBranche = "true";

    bouton.addEventListener("click", async (evenement) => {
      evenement.preventDefault();
      evenement.stopPropagation();

      const cible = bouton.getAttribute("data-copier") || "";
      const dit = bouton.hasAttribute("data-copier-texte")
        ? bouton.getAttribute("data-copier-texte")
        : await (resoudre ? resoudre(cible, bouton) : "");

      if (await copierDansLePressePapiers(dit)) marquerCopie(bouton);
    });
  }
}

/** Ce que le composant sait dessiner, pour qui veut vérifier. */
export const ICONES = { copier: ICONE_COPIER, copie: ICONE_COPIE };
