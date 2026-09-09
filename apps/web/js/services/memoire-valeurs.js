/**
 * Pour un nom et une zone, une seule valeur vaut.
 *
 * ## Le défaut
 *
 * `H0 retenu pour le département` se lisait ainsi dans `structure.ctr` :
 *
 * ```
 *    batiment-a: 0,5 m { … le: 9 septembre 2026 … statut: retenu },
 *    batiment-a: 0,5 m { … le: 7 septembre 2026 … statut: retenu },
 * ```
 *
 * Deux lignes, la même zone, le même nom, toutes deux « retenu ». Le second
 * versement n'avait pas remplacé le premier — personne n'avait posé
 * `superseded_by` —, alors les deux vivaient. À dix versements, un fichier
 * devient une pile où l'on ne sait plus ce que le projet tient pour vrai.
 *
 * C'est la règle 10 des fondamentaux, un cran plus bas : un nom vit à un seul
 * endroit, et **à un endroit donné il ne vaut qu'une chose à la fois**.
 *
 * ## La règle
 *
 * Le **dernier** versement d'un nom, pour une zone, est ce que le projet tient
 * pour vrai. Les précédents sont son histoire — ils restent lisibles dans
 * l'origine de la ligne, qui est l'endroit où on les cherche.
 *
 * Un versement n'en éclipse un autre que s'il porte **exactement la même
 * portée**. Corriger le bâtiment A ne dit rien du bâtiment B, et une valeur
 * versée « toutes zones » n'est pas la même affirmation qu'une valeur versée
 * pour un bâtiment : l'une vaut partout, l'autre ici. Laquelle l'emporte
 * lorsqu'elles se recouvrent est une question de portée, et elle se tranche
 * devant quelqu'un — pas ici, en silence.
 *
 * ## Ce qu'on ne fait pas en silence
 *
 * Quand les versements éclipsés disaient **autre chose**, ce n'est plus un
 * doublon : c'est un désaccord, et le taire reviendrait à trancher à la place
 * de quelqu'un. `valeursCorrigees` les nomme, et l'écran le dit.
 *
 * ## Pourquoi à la lecture, et pas à l'écriture
 *
 * Poser `superseded_by` au moment du versement serait mieux — et reste à
 * faire. Mais une mémoire déjà écrite ne se réécrit pas : la règle appliquée
 * ici remet d'aplomb ce qui existe **et** ce qui arrivera demain d'un
 * utilitaire tiers qui aurait oublié de remplacer.
 */

import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les zones d'une affirmation, normalisées. Vide = « toutes zones ». */
function zonesDe(assertion = {}) {
  const dites = Array.isArray(assertion?.payload?.zones) && assertion.payload.zones.length
    ? assertion.payload.zones
    : (Array.isArray(assertion?.zones) ? assertion.zones : []);
  return new Set(dites.map((zone) => cleDuSujet(zone)).filter(Boolean));
}

/** La portée d'un versement, sous une forme qui se compare. */
function portee(assertion = {}) {
  return [...zonesDe(assertion)].sort().join("\u0000");
}

/** Quand un versement a été fait. Sans date, il passe pour le plus ancien. */
function quand(assertion = {}) {
  const dit = texte(assertion?.decided_at) || texte(assertion?.created_at);
  const date = dit ? Date.parse(dit) : Number.NaN;
  return Number.isFinite(date) ? date : Number.NEGATIVE_INFINITY;
}

/** Ce qu'un versement affirme, réduit à ce qui se compare. */
function dit(assertion = {}) {
  return texte(assertion?.payload?.value) || texte(assertion?.statement);
}

/**
 * Le versement le plus récent l'emporte ; à date égale, l'identifiant tranche.
 *
 * Il faut un ordre **total** : sans lui, deux lectures des mêmes affirmations
 * garderaient deux lignes différentes, et le fichier changerait d'un rendu à
 * l'autre sans que rien n'ait été versé.
 */
function duPlusRecent(gauche, droite) {
  return quand(droite) - quand(gauche)
    || texte(droite?.id).localeCompare(texte(gauche?.id), "en", { numeric: true });
}

/** Une affirmation qui ne porte pas de valeur — une règle — ne s'éclipse pas. */
function porteUneValeur(assertion) {
  return Boolean(assertion)
    && assertion?.payload?.referentiel !== true
    && !texte(assertion?.superseded_by)
    && Boolean(cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key)));
}

/**
 * Les versements qu'un plus récent a remplacés, sur toutes leurs zones.
 *
 * @param {object[]} assertions
 * @returns {Set<string>} leurs identifiants
 */
export function versementsEclipses(assertions = []) {
  const parNom = new Map();

  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur)) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const eclipses = new Set();

  for (const versements of parNom.values()) {
    if (versements.length < 2) continue;
    const ordonnes = versements.slice().sort(duPlusRecent);

    for (let rang = 1; rang < ordonnes.length; rang += 1) {
      const ancien = ordonnes[rang];
      const sienne = portee(ancien);

      // Même nom, même portée, plus récent : c'est le même énoncé, refait.
      const refait = ordonnes.slice(0, rang).some((recent) => portee(recent) === sienne);
      if (refait) eclipses.add(texte(ancien.id));
    }
  }

  return eclipses;
}

/**
 * Les noms dont un versement plus récent a changé la valeur, sans le dire.
 *
 * Un doublon — la même valeur versée deux fois — ne se signale pas : il n'y a
 * rien à trancher. Une valeur qui change en silence, si : quelqu'un doit savoir
 * que le projet ne dit plus la même chose qu'hier.
 *
 * @returns {{nom: string, avant: string, apres: string, zones: string[]}[]}
 */
export function valeursCorrigees(assertions = []) {
  const eclipses = versementsEclipses(assertions);
  if (!eclipses.size) return [];

  const parNom = new Map();
  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur)) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const corrections = [];

  for (const versements of parNom.values()) {
    const ordonnes = versements.slice().sort(duPlusRecent);
    const vivant = ordonnes.find((assertion) => !eclipses.has(texte(assertion.id)));
    if (!vivant) continue;

    // Un seul avis par nom : répéter la correction pour chaque versement
    // éclipsé ferait lire dix désaccords là où le projet en a un.
    const autre = ordonnes.find((assertion) =>
      eclipses.has(texte(assertion.id))
      && portee(assertion) === portee(vivant)
      && dit(assertion) !== dit(vivant));
    if (!autre) continue;

    corrections.push({
      nom: texte(vivant?.payload?.subject) || texte(vivant?.subject_key),
      avant: dit(autre),
      apres: dit(vivant),
      zones: [...zonesDe(vivant)]
    });
  }

  return corrections;
}
