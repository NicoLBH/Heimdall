/**
 * Savoir qu'un projet a **bougé**, et de combien.
 *
 * ## Pourquoi le code INSEE ne suffit pas
 *
 * Le rejeu ne regardait qu'une chose : le code INSEE avait-il changé ? C'est
 * grossier au point d'être faux. Une commune française fait en moyenne quinze
 * kilomètres carrés ; Briançon en fait vingt-huit, et son altitude y varie de
 * mille mètres. Déplacer un projet de cent mètres à l'intérieur de la même
 * commune, ce n'est rien pour la table de zonage — c'est un versant pour
 * l'altitude, donc pour la cote hors gel, donc pour les fondations.
 *
 * Et l'inverse est vrai aussi : corriger « 12 rue des Cordeliers » en
 * « 12 rue des Cordeliers, bât. B » ne déplace pas le projet d'un mètre. Un
 * écran qui rangerait tout ce qui en découle « à revérifier » pour cette
 * correction-là apprendrait à ignorer l'avertissement, et c'est celui d'après
 * qu'on ne croirait plus.
 *
 * ## Ce que ce fichier décide, et ce qu'il ne décide pas
 *
 * Il dit **si** un projet a bougé et **de combien**. Il ne dit pas ce qu'il faut
 * en refaire : c'est le rejeu qui le sait, à partir de ce que chaque utilitaire
 * déclare lire.
 *
 * Il ne parle à personne : deux coordonnées entrent, une distance sort.
 */

import { nombreOuRien } from "./adresse-saisie.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * En deçà, on considère que le projet n'a pas bougé.
 *
 * Cinquante mètres : c'est la précision d'un point qu'on pose à la main sur une
 * vue satellite, et c'est en dessous de ce qui change une altitude relevée au
 * pas de vingt-cinq mètres. Au-delà, le projet est ailleurs — et l'utilisateur
 * l'a dit lui-même en pointant ailleurs.
 */
export const SEUIL_DE_DEPLACEMENT = 50;

/** Le rayon de la Terre, en mètres. */
const RAYON = 6_371_000;

const radians = (degres) => (degres * Math.PI) / 180;

/**
 * La distance entre deux points, en mètres, à vol d'oiseau.
 *
 * Haversine, et non une différence de degrés : un degré de longitude vaut
 * 111 km à l'équateur et 78 km à Lille. Comparer des degrés reviendrait à dire
 * qu'un projet a moins bougé parce qu'il est plus au nord.
 *
 * `null` dès qu'il manque une coordonnée : on ne sait pas, et une distance
 * inventée est pire qu'une distance absente (règle 5).
 */
export function distanceEnMetres(depart = null, arrivee = null) {
  const lat1 = nombreOuRien(depart?.latitude ?? depart?.lat);
  const lon1 = nombreOuRien(depart?.longitude ?? depart?.lon);
  const lat2 = nombreOuRien(arrivee?.latitude ?? arrivee?.lat);
  const lon2 = nombreOuRien(arrivee?.longitude ?? arrivee?.lon);

  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;

  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * RAYON * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Pourquoi une localisation en remplace une autre. Chacun se dit à l'écran. */
export const MOUVEMENT = {
  /** Rien n'a bougé de ce qui compte. */
  AUCUN: "aucun",
  /** Le projet a changé de commune : les tables de zonage changent avec. */
  COMMUNE: "commune",
  /** Même commune, mais le point s'est déplacé au-delà du seuil. */
  DEPLACE: "deplace",
  /**
   * Ce qui a changé ne dit rien du lieu : une adresse corrigée, un code postal
   * ajouté. Le projet est au même endroit.
   */
  ECRITURE: "ecriture",
  /** On n'a pas de quoi comparer : l'un des deux points manque. */
  INCONNU: "inconnu"
};

/**
 * Ce qui sépare deux localisations.
 *
 * @param {object|null} avant la ligne d'aujourd'hui
 * @param {object|null} apres celle qu'on propose ou qu'on essaie
 * @returns {{mouvement: string, metres: number|null, phrase: string}}
 */
export function deplacementEntre(avant = null, apres = null) {
  if (!avant || !apres) return { mouvement: MOUVEMENT.INCONNU, metres: null, phrase: PHRASES[MOUVEMENT.INCONNU] };

  const communeAvant = texte(avant.codeInsee ?? avant.code_insee);
  const communeApres = texte(apres.codeInsee ?? apres.code_insee);
  if (communeAvant && communeApres && communeAvant !== communeApres) {
    const metres = distanceEnMetres(avant, apres);
    return { mouvement: MOUVEMENT.COMMUNE, metres, phrase: phraseDuDeplacement(MOUVEMENT.COMMUNE, metres) };
  }

  const metres = distanceEnMetres(avant, apres);
  if (metres === null) {
    // Sans point des deux côtés, on ne sait pas si le projet a bougé. Le dire
    // vaut mieux que de répondre « non » — ce serait affirmer qu'il n'a pas
    // bougé sur la foi d'une adresse recopiée.
    return { mouvement: MOUVEMENT.INCONNU, metres: null, phrase: PHRASES[MOUVEMENT.INCONNU] };
  }

  if (metres >= SEUIL_DE_DEPLACEMENT) {
    return { mouvement: MOUVEMENT.DEPLACE, metres, phrase: phraseDuDeplacement(MOUVEMENT.DEPLACE, metres) };
  }

  // Le point n'a pas bougé. Reste à savoir si quelque chose a changé du tout :
  // une adresse corrigée est une écriture, pas un déplacement.
  const memeEcriture = ["commune", "codePostal", "adresse"]
    .every((cle) => texte(avant[cle]) === texte(apres[cle]));

  return memeEcriture
    ? { mouvement: MOUVEMENT.AUCUN, metres, phrase: PHRASES[MOUVEMENT.AUCUN] }
    : { mouvement: MOUVEMENT.ECRITURE, metres, phrase: phraseDuDeplacement(MOUVEMENT.ECRITURE, metres) };
}

/** Vrai quand ce qui découle de la localisation doit être refait. */
export function laLocalisationABouge(avant = null, apres = null) {
  const { mouvement } = deplacementEntre(avant, apres);
  // `INCONNU` compte comme un mouvement : ne pas savoir n'autorise pas à
  // prétendre qu'il n'y a rien (règle 5). Mieux vaut rejouer pour rien que
  // laisser une cote hors gel calculée ailleurs.
  return mouvement === MOUVEMENT.COMMUNE
    || mouvement === MOUVEMENT.DEPLACE
    || mouvement === MOUVEMENT.INCONNU;
}

const PHRASES = {
  [MOUVEMENT.AUCUN]: "Le projet est au même endroit.",
  [MOUVEMENT.INCONNU]: "On ne sait pas si le projet a bougé : l'un des deux points manque.",
  [MOUVEMENT.ECRITURE]: "L'écriture change, le projet ne bouge pas.",
  [MOUVEMENT.COMMUNE]: "Le projet change de commune.",
  [MOUVEMENT.DEPLACE]: "Le projet se déplace dans la même commune."
};

/**
 * La phrase d'un déplacement, avec sa distance.
 *
 * La distance s'écrit en mètres jusqu'au kilomètre, puis en kilomètres : « 1 240 m »
 * ne se lit pas, et « 0,05 km » non plus.
 */
export function phraseDuDeplacement(mouvement, metres = null) {
  const base = PHRASES[texte(mouvement)] ?? "";
  const dit = distanceDite(metres);
  return dit ? `${base} ${dit}` : base;
}

/** Une distance, écrite pour être lue. `""` quand on ne l'a pas. */
export function distanceDite(metres = null) {
  const n = nombreOuRien(metres);
  if (n === null) return "";
  if (n < 1) return "Moins d'un mètre.";
  if (n < 1000) return `Environ ${Math.round(n)} m.`;
  return `Environ ${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km.`;
}
