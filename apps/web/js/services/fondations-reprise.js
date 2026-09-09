/**
 * Refaire une étude de fondations, quand ce dont elle dépend a changé.
 *
 * ## Ce qui manquait, et qui n'était pas un problème de code
 *
 * La chaîne `altitude → profondeur hors gel → fondations` était **enregistrée**
 * : une variante d'altitude marquait bien tout le tableau des massifs comme à
 * refaire. Elle ne le refaisait pas, et pour une raison de fond : le calcul est
 * au serveur, et **ses entrées n'étaient nulle part**. Charges, sol, butée,
 * ferraillage vivaient dans l'étude privée de l'Atelier ; il n'y avait rien à
 * renvoyer.
 *
 * Le versement conserve maintenant le tableau d'entrée comme une donnée de base
 * du projet (voir `fondations-versement.js`). C'est ce qui rend ce fichier
 * possible : on relit ce tableau, on y applique la valeur essayée, on redemande
 * le calcul, et l'on compare le tableau d'après au tableau d'avant.
 *
 * ## Ce que la reprise change, et rien d'autre
 *
 * **L'assise, et par elle seule.** La profondeur hors gel commande la cote sous
 * laquelle le fond de fouille doit descendre ; elle ne dit rien des sections, du
 * ferraillage ni des charges. On enterre donc le massif — l'arase descend, le
 * massif ne change pas — et l'on laisse le serveur dire ce que cela fait à la
 * stabilité. Épaissir le massif serait le redimensionner, ce que personne n'a
 * demandé.
 *
 * Ce fichier ne parle à personne : le calcul lui est **passé**. C'est ce qui
 * permet de le tester sans réseau, et c'est la même règle que partout ailleurs —
 * le service est pur, l'aller-retour est ailleurs.
 */

import { descendreHorsGel } from "./fondations-memoire.js";
import { tableauDuResultat, phraseDuResultat } from "./fondations-versement.js";
import { SUJET_DONNEES, SUJET_RESULTAT } from "../utilitaires/dimensionnement_fondations_superficielles_V1.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Une cote lue comme un nombre. « -0,1 » et « -0.1 » disent la même chose. */
function cote(valeur) {
  const n = Number.parseFloat(texte(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Le sujet dont la reprise lit le tableau, et celui qu'elle réécrit. */
export { SUJET_DONNEES, SUJET_RESULTAT };

/**
 * Les massifs à renvoyer au calcul, sous une nouvelle profondeur hors gel.
 *
 * Un massif dont l'assise descend déjà assez bas ne bouge pas : la cote de
 * quelqu'un se conserve, et la variante ne porte que sur le manque. Sans cette
 * précaution, essayer une altitude **plus basse** remonterait des massifs qu'on
 * avait délibérément enterrés.
 *
 * @param {{designation: string, nombre: number, entrees: object}[]} tableau
 * @param {string|number} profondeurHorsGel la valeur essayée, en mètres
 * @returns {{id: null, designation: string, nombre: number, entrees: object}[]}
 */
export function semellesReprises(tableau = [], profondeurHorsGel = "") {
  const rappels = { profondeurHorsGel: { valeur: texte(profondeurHorsGel) } };

  return (Array.isArray(tableau) ? tableau : []).map((ligne, rang) => {
    const entrees = ligne?.entrees ?? {};
    return {
      id: null,
      designation: texte(ligne?.designation) || `Semelle ${rang + 1}`,
      nombre: Math.max(0, Math.trunc(Number(ligne?.nombre) || 0)),
      // La mémoire porte ses cotes en phrases — « -0,1 » —, le calcul les veut
      // en nombres. On normalise **toutes** les lignes, pas seulement celles
      // qu'on corrige : un tableau où la moitié des arases sont des textes et
      // l'autre des nombres se compare mal, et se relit encore moins bien.
      entrees: descendreHorsGel(entrees, rappels) ?? { ...entrees, araseSuperieure: cote(entrees.araseSuperieure) }
    };
  });
}

/**
 * Le tableau d'entrée que le projet porte, dans cette zone.
 *
 * `null` quand il n'y est pas — et c'est alors un refus motivé, jamais un
 * tableau vide : une étude qu'on n'a pas versée ne se reprend pas, et le dire
 * vaut mieux que de rendre zéro massif.
 */
export function tableauDuProjet(assertions = [], zone = "") {
  const cle = texte(SUJET_DONNEES).toLowerCase();
  const dansLaZone = (assertion) => {
    const portees = (assertion?.payload?.zones ?? []).map((portee) => texte(portee).toLowerCase());
    return portees.length ? portees.includes(texte(zone).toLowerCase()) : true;
  };

  const porte = (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => texte(assertion?.payload?.subject).toLowerCase() === cle
      || texte(assertion?.subject_key).toLowerCase().split("@")[0] === cle)
    .filter((assertion) => !texte(assertion?.superseded_by))
    .find(dansLaZone);

  const tableau = porte?.payload?.tableau;
  return Array.isArray(tableau) && tableau.length ? tableau : null;
}

/**
 * L'étude refaite : le nouveau tableau, et la phrase qui le résume.
 *
 * `calculer` reçoit les massifs et rend ce que le serveur a répondu, dans le
 * même ordre — c'est le contrat de `calculerLesSemelles`. Un massif qui échoue
 * ne fait pas échouer les autres : il ressort « non calculé », et le tableau le
 * dit plutôt que de compter un massif de moins.
 *
 * @param {object} options
 * @param {object[]} options.tableau les entrées que le projet porte
 * @param {string|number} options.profondeurHorsGel la valeur essayée
 * @param {(semelles: object[]) => Promise<object[]>} options.calculer l'aller-retour
 * @returns {Promise<{tableau: object[], valeur: string, massifs: number}>}
 */
export async function reprendreLEtude({ tableau = [], profondeurHorsGel = "", calculer } = {}) {
  const semelles = semellesReprises(tableau, profondeurHorsGel);
  if (!semelles.length) return null;
  if (typeof calculer !== "function") return null;

  const rendus = await calculer(semelles);
  const resultats = semelles.map((_, rang) => rendus?.[rang] ?? null);

  return {
    tableau: tableauDuResultat(semelles, resultats),
    valeur: phraseDuResultat(semelles, resultats),
    massifs: semelles.length
  };
}
