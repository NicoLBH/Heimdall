/**
 * Les usages du moteur de rejeu, et où chacun vit.
 *
 * ## Pourquoi une liste, et pas quatre écrans indépendants
 *
 * Changer une valeur et voir ce qui bouge n'est pas une fonctionnalité : c'est
 * un **moteur**, et une fois qu'on l'a, il sert quatre fois.
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
 * Les tenir dans une seule liste n'est pas une économie de place : c'est dire
 * qu'ils sont **la même chose**, vue de plusieurs côtés. Quatre déclarations
 * éparses laisseraient croire à quatre mécanismes, et l'une d'elles finirait par
 * mentir sur ce que le moteur sait faire (règle 4).
 *
 * ## Où ils vivent, depuis l'étape 1 du plan
 *
 * Les trois premiers **explorent** : ils essaient, ils vérifient, ils
 * interrogent — et n'écrivent rien. Leur place est donc l'**Atelier**, comme
 * tout ce qui prépare une proposition. Le quatrième ne pose pas de question : il
 * montre la forme du raisonnement, c'est une lecture, et il reste dans la
 * **Mémoire**. Voir `docs/a-traiter-plus-tard.md`, § 14.
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
 * `6` : le plan est fait. La variante ne connaît plus de sujet privilégié —
 * n'importe quelle valeur du socle se change, le moteur rejoue les strates en
 * aval, l'écran montre l'écart. C'était le but : que faire varier une valeur
 * devienne un appel de plus au même moteur, et non un mécanisme à part.
 */
export const ETAPE_ATTEINTE = 6;

/**
 * Les deux endroits où un usage peut vivre.
 *
 * Ce n'est pas une préférence de mise en page : c'est le critère du § 14 —
 * *la Mémoire ne contient que des écrans de lecture ; tout ce qui prépare une
 * proposition vit dans l'Atelier.* Un usage porte donc sa place, et les deux
 * écrans lisent la même liste plutôt que d'en tenir chacun la sienne.
 */
export const OU = { ATELIER: "atelier", MEMOIRE: "memoire" };

/** Les usages qui vivent à cet endroit-là, dans l'ordre de la liste. */
export function usagesDe(ou) {
  return USAGES.filter((usage) => usage.ou === ou);
}

/**
 * Les usages du moteur, dans l'ordre où on les lit.
 *
 * Les trois premiers **posent une question** — et si ? ça tient encore ? qu'est-ce
 * qui repose là-dessus ? Le quatrième n'en pose aucune : il montre la forme du
 * raisonnement, et c'est de là qu'on voit quelle question vaut la peine d'être
 * posée. Il vient donc en dernier, après elles.
 *
 * `depuisLEtape` dit à partir de quelle étape du plan le moteur sert cet usage.
 * Un usage servi avant que le moteur existe — la variante — le dit dans sa
 * phrase : il fait ce qu'il peut, et il le borne.
 */
export const USAGES = [
  {
    action: "tester:variante",
    ou: OU.ATELIER,
    nom: "Tester une variante",
    depuisLEtape: 0,
    quoi: "Changer n'importe quelle valeur du socle, rejouer ce qui en découle, et ne rien écrire."
  },
  {
    action: "tester:audit",
    ou: OU.ATELIER,
    nom: "Auditer la mémoire",
    depuisLEtape: 5,
    quoi: "Rejouer le raisonnement sur les valeurs d'aujourd'hui, et dire ce qui a dérivé. Rien n'est écrit."
  },
  {
    action: "tester:impact",
    ou: OU.ATELIER,
    nom: "Étude d'impact",
    depuisLEtape: 2,
    quoi: "Dire ce qui repose sur une valeur, avec le compte exact et les zones."
  },
  {
    action: "tester:cerveau",
    ou: OU.MEMOIRE,
    nom: "Le cerveau du projet",
    depuisLEtape: 6,
    quoi: "Voir le raisonnement en entier, en strates, et faire courir une onde depuis une valeur."
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
