/**
 * Refaire le spectre, quand ce dont il dépend a changé.
 *
 * ## Pourquoi ce fichier existe
 *
 * C'est la seconde moitié de la démonstration. Déplacer un projet change sa
 * commune, donc sa zone de sismicité, donc son spectre — et par lui tout ce qui
 * se dimensionne au séisme. Tant que le spectre ne se rejouait pas, la chaîne
 * s'arrêtait à la zone, et l'écran de variante disait « à revérifier » là où il
 * pouvait dire ce que ça devient.
 *
 * ## Ce qu'il relit du projet, et pourquoi il le relit
 *
 * Les quatre entrées de l'appel, **dans la mémoire** : la zone, la classe de
 * sol, la catégorie d'importance et l'amortissement. Pas dans les lectures
 * enregistrées de l'appel : celles-ci disent ce que ce calcul-**là** avait lu,
 * ce qui est précieux pour l'histoire et faux pour une reprise — entre-temps,
 * quelqu'un a pu corriger la classe de sol.
 *
 * La valeur essayée passe par-dessus, et rien d'autre ne bouge.
 *
 * ## Il ne parle à personne
 *
 * Le calcul lui est **passé**. C'est ce qui permet de le tester sans rien
 * charger, et c'est la même règle que partout : le service est pur, l'appel est
 * ailleurs. Ici, cet appel n'a même pas de réseau à attendre — le module du
 * spectre est le même des deux côtés, copié au build. Voir
 * `utilitaires/agent-spectre.js`.
 */

import {
  STRUCTURE_DU_SPECTRE,
  SUJET_AMORTISSEMENT,
  SUJET_CATEGORIE_IMPORTANCE,
  SUJET_CLASSE_DE_SOL,
  SUJET_SPECTRE,
  SUJET_ZONE_SISMIQUE
} from "../utilitaires/agent-spectre.js";
import { ligneDuSpectre, phraseDuSpectre } from "./spectre-versement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le sujet que la reprise réécrit. */
export { SUJET_SPECTRE };

/** Par quel champ de l'appel chaque sujet entre. Déclaré une fois, ici lu. */
const CHAMP_DU_SUJET = {
  [SUJET_ZONE_SISMIQUE]: "zoneSismique",
  [SUJET_CLASSE_DE_SOL]: "soilClass",
  [SUJET_CATEGORIE_IMPORTANCE]: "importanceCategory",
  [SUJET_AMORTISSEMENT]: "dampingRatio"
};

/** Cette affirmation vaut-elle dans cette zone ? Sans portée, elle vaut partout. */
function vautDans(assertion, zone) {
  const portees = (assertion?.payload?.zones ?? []).map((portee) => texte(portee).toLowerCase());
  return portees.length ? portees.includes(texte(zone).toLowerCase()) : true;
}

/** La valeur en vigueur d'un sujet, dans cette zone, ou `""`. */
function valeurDuSujet(assertions, sujet, zone) {
  const cherche = texte(sujet).toLowerCase();

  const porte = (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => texte(assertion?.payload?.subject).toLowerCase() === cherche
      || texte(assertion?.subject_key).toLowerCase().split("@")[0] === cherche)
    .filter((assertion) => !texte(assertion?.superseded_by))
    .find((assertion) => vautDans(assertion, zone));

  return texte(porte?.payload?.value);
}

/**
 * Les quatre entrées du spectre, telles que le projet les porte aujourd'hui.
 *
 * `null` quand la zone manque : sans elle il n'y a pas d'accélération de
 * référence, et rendre un spectre à sept colonnes ferait passer une lacune pour
 * une courbe. Les trois autres ont des valeurs par défaut dans le module —
 * rocher, catégorie II, 5 % —, qui sont celles du texte.
 */
export function entreesDuProjet(assertions = [], zone = "") {
  const entrees = {};
  for (const [sujet, champ] of Object.entries(CHAMP_DU_SUJET)) {
    entrees[champ] = valeurDuSujet(assertions, sujet, zone);
  }
  return entrees.zoneSismique ? entrees : null;
}

/**
 * Le spectre refait : la nouvelle ligne, et la phrase qui la résume.
 *
 * @param {object} options
 * @param {object} options.entrees les quatre entrées, telles que le projet les porte
 * @param {object} options.champs ce que la variante remplace
 * @param {Function} options.calculer le module du spectre — injecté, jamais importé ici
 * @returns {{valeur: string, tableau: object[]}|null}
 */
export function reprendreLeSpectre({ entrees = null, champs = {}, calculer = null } = {}) {
  if (!entrees || typeof calculer !== "function") return null;

  const essayees = { ...entrees, ...(champs ?? {}) };
  const ligne = ligneDuSpectre(calculer(essayees));
  if (!ligne) return null;

  return { valeur: phraseDuSpectre(ligne), tableau: [ligne] };
}

/** Les colonnes de la ligne, pour qui voudra la montrer. */
export { STRUCTURE_DU_SPECTRE };
