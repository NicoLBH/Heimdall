/**
 * Où une affirmation se range, et sous quel nom.
 *
 * ## L'arborescence suit la zone, puis le domaine
 *
 * Elle suivait la nature, puis le domaine : `contraintes/incendie`,
 * `donnees-de-base/structure`. C'était logique pour qui range, pas pour qui
 * cherche. Sur un chantier on ne dit pas « les données de base de l'incendie,
 * pour l'escalier B » : on dit **« l'escalier B, l'incendie, ce qui a été
 * relevé »**. On part du morceau d'ouvrage qu'on a en tête.
 *
 * ```
 * Escalier B/incendie.ref     les règles appliquées à cet escalier
 * Escalier B/incendie.ctr     ce qui s'y impose
 * Escalier B/incendie.ddb     ce qui y a été relevé
 * Escalier A/incendie.ref     et ce ne sont pas les mêmes règles
 * ```
 *
 * Le gain est double. L'arborescence est **plus courte** — deux niveaux au lieu
 * de trois — parce que la nature descend dans l'extension. Et tout ce qui
 * concerne une zone se lit d'un seul endroit, ce qui est exactement le geste
 * qu'on fait quand on travaille sur cette zone.
 *
 * Ce qu'on y perd : « montre-moi toutes les hypothèses du projet » demande
 * maintenant la recherche plutôt qu'un dossier. C'est le bon échange — la
 * première question se pose tous les jours, la seconde une fois par mois.
 *
 * ## L'extension dit ce que le fichier contient
 *
 * Deux `incendie.mdall` à deux endroits n'ont pas de sens, et c'est dangereux :
 * on ouvre l'un en croyant l'autre. Comme `app.html`, `app.css` et `app.js`
 * disent trois choses du même `app`, l'extension dit la **nature** — et chaque
 * nature a sa forme d'écriture.
 *
 * ```
 * .ref   des règles          Sujet (entrées) / si / alors / texte: / parce que:
 * .ctr   des contraintes     Sujet = valeur / règle: / statut:
 * .ddb   des données de base Sujet = valeur / document: / parce que:
 * .hyp   des hypothèses      Sujet = valeur / hypothèse: / statut: supposé
 * .cst   des constats        Sujet = valeur / le: / document: / parce que:
 * .crp   le corpus           ce qui est entré au dossier
 * ```
 *
 * ## Une règle appartient à une zone
 *
 * Le texte de l'arrêté est universel ; **les règles appliquées ne le sont
 * pas**. L'escalier A classé en 3ᵉ famille B et l'escalier B classé en 2ᵉ
 * famille ne suivent pas les mêmes articles. Une règle se range donc dans la
 * zone où elle a été appliquée, comme tout le reste.
 *
 * ## Ce qui n'a pas de zone
 *
 * Ce qui vaut pour tout l'ouvrage. Ce n'est pas un manque, c'est une portée —
 * et c'est le cas le plus fréquent au début d'un projet.
 *
 * ## Ce qui n'a pas de nature
 *
 * Une extension `.mdall` plutôt qu'un rangement deviné. Une affirmation dont on
 * ignore la nature ne devient pas une donnée de base parce que c'est la plus
 * courante : ne pas savoir n'autorise pas à prétendre (fondamentaux, règle 5),
 * et un fichier qui se remplit tout seul dit qu'un utilitaire a oublié de se
 * prononcer.
 */

import { NATURE, DOMAIN, normalizeNature, normalizeDomain, domainLabel, natureLabel } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * L'extension de chaque nature. Trois lettres, comme on en tape.
 *
 * Elle remplace le dossier de nature : ce que le fichier contient se lit sur
 * son nom, et l'arborescence garde deux niveaux au lieu de trois.
 */
export const EXTENSIONS = {
  [NATURE.DONNEE_BASE]: "ddb",
  [NATURE.CONTRAINTE]: "ctr",
  [NATURE.HYPOTHESE]: "hyp",
  [NATURE.CONSTAT]: "cst",
  [NATURE.INTENDANCE]: "crp"
};

/** Les règles appliquées. Elles n'ont pas de nature : ce sont des textes. */
export const EXTENSION_REGLE = "ref";

/** Ce dont on ignore la nature. Cette extension ne devrait pas se rencontrer. */
export const SANS_NATURE = "mdall";

/** La zone de ce qui vaut pour l'ouvrage entier. Une portée, pas un manque. */
export const TOUT_LOUVRAGE = "Tout l'ouvrage";

/** Là où va ce dont on ignore le domaine. */
export const SANS_DOMAINE = "Non classé";

/**
 * Ce qu'une extension dit, en une phrase.
 *
 * Une extension nommée sans être expliquée se lit de travers : `.ctr` et `.ddb`
 * se ressemblent assez pour qu'on range au hasard.
 */
export function phraseDeLExtension(extension) {
  const dit = texte(extension);
  if (dit === EXTENSION_REGLE) {
    return "Les règles appliquées, telles qu'elles étaient le jour où on les a appliquées.";
  }

  const entree = Object.entries(EXTENSIONS).find(([, ext]) => ext === dit);
  if (!entree) return "Ce que personne n'a encore classé. Ce fichier ne devrait pas se remplir.";

  return {
    [NATURE.DONNEE_BASE]: "Ce qui a été relevé sur le site ou le programme. Ne se discute pas, ne se calcule pas.",
    [NATURE.CONTRAINTE]: "Ce qui s'impose au projet. Si vous n'êtes pas d'accord, vous n'avez pas de recours.",
    [NATURE.HYPOTHESE]: "Ce qu'on suppose en attendant mieux. Se remplace, et ce qui en dépend devient suspect.",
    [NATURE.CONSTAT]: "Ce qui a été observé, à une date. Un constat sans date ne vaut rien.",
    [NATURE.INTENDANCE]: "Ce qui est entré au dossier : documents, pièces jointes, avis."
  }[entree[0]];
}

/** L'ordre de lecture des extensions : les textes d'abord, puis ce qu'on en tire. */
export const ORDRE_DES_EXTENSIONS = [
  EXTENSION_REGLE,
  EXTENSIONS[NATURE.DONNEE_BASE],
  EXTENSIONS[NATURE.CONTRAINTE],
  EXTENSIONS[NATURE.HYPOTHESE],
  EXTENSIONS[NATURE.CONSTAT],
  EXTENSIONS[NATURE.INTENDANCE],
  SANS_NATURE
];

/** Le rang d'une extension, pour trier. Les inconnues en dernier. */
export function rangDeLExtension(extension) {
  const rang = ORDRE_DES_EXTENSIONS.indexOf(texte(extension));
  return rang === -1 ? ORDRE_DES_EXTENSIONS.length : rang;
}

/**
 * L'extension d'une affirmation : ce qu'elle est.
 *
 * Une règle appliquée n'a pas de nature — c'est un texte, pas un fait constaté
 * — et son extension le dit avant tout le reste.
 */
export function extensionDeRangement({ nature = "", referentiel = false } = {}) {
  if (referentiel === true) return EXTENSION_REGLE;
  const famille = normalizeNature(nature);
  return famille ? EXTENSIONS[famille] : SANS_NATURE;
}

/**
 * Le chemin d'une affirmation : sa zone, puis son domaine.
 *
 * L'extension n'y figure pas — elle se calcule à part, parce que deux fichiers
 * du même chemin et d'extensions différentes sont deux fichiers voisins, pas
 * deux dossiers.
 *
 * @param {{nature?: string, domain?: string, zones?: string[], referentiel?: boolean}} affirmation
 * @returns {string[]} `["Escalier B", "Incendie"]`
 */
export function cheminDeRangement({ domain = "", zones = [] } = {}) {
  const domaine = normalizeDomain(domain);
  const portees = (Array.isArray(zones) ? zones : [zones]).map(texte).filter(Boolean);

  return [
    // La première zone nomme le fichier. Une affirmation qui vaut pour deux
    // zones apparaît dans les deux : voir `cheminsDeRangement`.
    portees[0] || TOUT_LOUVRAGE,
    domaine ? domainLabel(domaine) : SANS_DOMAINE
  ];
}

/**
 * Tous les chemins d'une affirmation — un par zone où elle vaut.
 *
 * Une contrainte qui vaut pour l'escalier A **et** pour l'escalier B se lit dans
 * les deux fichiers. Ce n'est pas une copie : c'est la même affirmation, vue de
 * deux endroits, et elle porte le même identifiant dans les deux.
 *
 * L'alternative — un dossier « A + B » — cacherait la contrainte à qui ouvre
 * l'escalier A, ce qui est exactement l'erreur qu'on veut éviter.
 */
export function cheminsDeRangement({ domain = "", zones = [] } = {}) {
  const portees = [...new Set((Array.isArray(zones) ? zones : [zones]).map(texte).filter(Boolean))];
  if (!portees.length) return [cheminDeRangement({ domain })];
  return portees.map((zone) => cheminDeRangement({ domain, zones: [zone] }));
}

/**
 * Les zones, dans l'ordre où on les lit.
 *
 * « Tout l'ouvrage » d'abord : ce qui vaut partout se lit avant ce qui ne vaut
 * qu'ici, et c'est aussi ce qui existe en premier dans un projet.
 */
export function rangDeLaZone(zone) {
  return texte(zone) === TOUT_LOUVRAGE ? 0 : 1;
}

/**
 * Ce qu'une zone dit d'elle-même, en une phrase.
 *
 * Un dossier nommé sans être expliqué se remplit de travers, et « Tout
 * l'ouvrage » se confond avec « je n'ai pas su où le mettre ».
 */
export function phraseDeLaZone(zone) {
  return texte(zone) === TOUT_LOUVRAGE
    ? "Ce qui vaut pour l'ensemble du projet, sans distinction de bâtiment ni de cage."
    : `Ce que le projet retient pour ${texte(zone)}, et rien d'autre.`;
}
