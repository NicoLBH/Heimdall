/**
 * Les trois usages du moteur de rejeu, sous un seul bouton.
 *
 * ## Pourquoi trois, et pourquoi ensemble
 *
 * Changer une valeur et voir ce qui bouge n'est pas une fonctionnalité : c'est
 * un **moteur**, et une fois qu'on l'a, il sert trois fois.
 *
 * - **Tester une variante** — « et si ? ». On change une valeur du socle, on lit
 *   les conséquences, on n'écrit rien.
 * - **Auditer la mémoire** — rejouer tout le calque dérivé sur les valeurs
 *   **actuelles**, et comparer. Une différence sur des entrées inchangées est un
 *   défaut de la mémoire : ce que le projet affirme n'est plus ce que ses
 *   propres règles concluent.
 * - **Étude d'impact** — « qu'est-ce qui repose sur cette valeur ? ». C'est la
 *   question qu'un ingénieur pose vraiment, et c'est le même graphe lu à
 *   l'envers.
 *
 * Les mettre sous un même bouton n'est pas une économie de place : c'est dire
 * qu'ils sont **la même chose**, vue de trois côtés. Trois boutons épars
 * laisseraient croire à trois mécanismes.
 *
 * ## Pourquoi un usage peut être éteint
 *
 * Le moteur se construit par étapes — `docs/rejouer-la-memoire.md`. Un usage que
 * le moteur ne sert pas encore est **désactivé et dit son étape**, plutôt que
 * d'être absent ou, pire, présent et menteur. Un bouton qui prétend faire ce
 * qu'il ne fait pas coûte plus cher que l'absence du bouton.
 *
 * Avancer le plan, c'est déplacer `ETAPE_ATTEINTE` d'un cran. Le menu suit.
 */

import { svgIcon } from "../../ui/icons.js";
import { renderGhActionButton } from "./gh-split-button.js";

/**
 * Jusqu'où le moteur de rejeu est construit.
 *
 * Les étapes sont celles de `docs/rejouer-la-memoire.md` :
 *
 * 1. enregistrer l'application d'une règle — arêtes `id → id`, zonées, rangées
 * 2. l'index dans les deux sens — qui emploie chaque donnée, combien de fois
 * 3. l'évaluateur du `.ref`
 * 4. le plan de recalcul, en strates
 * 5. le rejeu à blanc
 * 6. la variante, alors triviale
 *
 * `5` : le rejeu à blanc existe. Les trois usages sont servis, et le moteur
 * répond à la question pour laquelle le produit existe — ce que le projet
 * affirme est-il encore ce que ses règles concluent ?
 */
export const ETAPE_ATTEINTE = 5;

/**
 * Les trois usages, dans l'ordre où on les lit.
 *
 * `depuisLEtape` dit à partir de quelle étape du plan le moteur sert cet usage.
 * Un usage servi avant que le moteur existe — la variante — le dit dans sa
 * phrase : il fait ce qu'il peut, et il le borne.
 */
export const USAGES = [
  {
    action: "tester:variante",
    nom: "Tester une variante",
    depuisLEtape: 0,
    quoi: "Changer une valeur du socle, lire les conséquences, et ne rien écrire."
  },
  {
    action: "tester:audit",
    nom: "Auditer la mémoire",
    depuisLEtape: 5,
    quoi: "Rejouer le raisonnement sur les valeurs d'aujourd'hui, et dire ce qui a dérivé. Rien n'est écrit."
  },
  {
    action: "tester:impact",
    nom: "Étude d'impact",
    depuisLEtape: 2,
    quoi: "Dire ce qui repose sur une valeur, avec le compte exact et les zones."
  }
];

/** Vrai quand le moteur sert déjà cet usage. */
export function estServi(usage) {
  return ETAPE_ATTEINTE >= Number(usage?.depuisLEtape ?? Infinity);
}

/**
 * Ce qu'un item dit de lui-même.
 *
 * Servi, il porte son nom. Pas encore, il porte son étape : « — étape 5 » est
 * une promesse datée, et c'est plus utile qu'un item grisé sans raison.
 */
export function libelleDeLUsage(usage) {
  return estServi(usage) ? usage.nom : `${usage.nom} — étape ${usage.depuisLEtape}`;
}

/**
 * Le bouton et son menu.
 *
 * Le clic principal **ouvre le menu** : on ne « teste » pas en général, on
 * choisit ce qu'on teste. Sans cela, la moitié gauche du bouton ne ferait rien.
 *
 * @param {object} [options]
 * @param {Set<string>|string[]} [options.indisponibles] les actions que l'écran
 *   ne peut pas servir maintenant — un projet sans altitude n'a pas de variante
 *   à essayer. Distinct de « pas encore construit » : l'une est une lacune du
 *   moteur, l'autre un état du projet.
 * @param {boolean} [options.busy]
 */
export function renderBoutonTester({ indisponibles = [], busy = false } = {}) {
  const hors = new Set(indisponibles);

  return renderGhActionButton({
    id: "memoireTester",
    label: "Tester",
    icon: svgIcon("beaker", { className: "octicon" }),
    size: "md",
    // Rien ne se déclenche au clic principal : le menu s'ouvre, et l'on choisit.
    menuOnMain: true,
    disabled: busy,
    className: "bouton-tester",
    items: USAGES.map((usage) => {
      const servi = estServi(usage);
      const dispo = servi && !hors.has(usage.action);

      return {
        action: usage.action,
        label: libelleDeLUsage(usage),
        disabled: !dispo,
        // La phrase entière au survol : le menu dit quoi, l'infobulle dit
        // pourquoi. Un item éteint sans raison se lit comme une panne.
        title: servi
          ? (dispo ? usage.quoi : `${usage.quoi} — rien à faire varier dans ce projet pour l'instant.`)
          : `${usage.quoi} Le moteur de rejeu ne le sert pas encore : étape ${usage.depuisLEtape} du plan (docs/rejouer-la-memoire.md).`
      };
    })
  });
}
