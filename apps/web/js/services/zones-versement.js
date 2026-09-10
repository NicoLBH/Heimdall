/**
 * Le découpage du projet, tel qu'il se propose à la mémoire.
 *
 * ## Le défaut qu'on ferme
 *
 * L'écran du découpage **écrivait directement** : définir une zone, la renommer,
 * la retirer allaient en base sans proposition et sans signature. C'était une
 * exception à la règle 1 — *rien n'entre jamais directement dans la mémoire* —,
 * et pas la moindre : le découpage porte tout le reste. Une valeur qui ne vaut
 * que pour le bâtiment A n'a de sens que si le bâtiment A existe, et retirer une
 * zone sort du présent tout ce qu'elle portait.
 *
 * On perdait donc le **qui, quand, pourquoi** sur ce qui structure le projet, et
 * un retrait de zone — un acte considérable, qui peut sortir quatre-vingts
 * lignes du présent — passait sans que personne l'ait relu.
 *
 * ## Retirer, ce n'est pas refuser
 *
 * Une proposition peut être refusée par celui qui la relit : cela veut dire « ne
 * l'applique pas ». Retirer une zone est l'inverse — c'est une décision du
 * projet, qu'on **propose** et qu'on signe.
 *
 * Le retrait se verse donc comme une **définition de plus**, marquée `retiree`,
 * qui périme la précédente sur la même clé. La zone reste dans l'histoire, avec
 * son auteur et sa date ; elle quitte les listes. C'est la règle 11 : on ne
 * corrige pas la mémoire, on verse par-dessus.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { normalizeZoneKey } from "./project-zones.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'écran d'où ces lignes viennent. Il s'affiche sur chacune. */
export const ECRAN = "Découpage du projet";

/**
 * La définition d'une zone, prête à être proposée.
 *
 * Elle ne porte **pas de zone elle-même** : une définition vaut pour l'ouvrage,
 * pas pour la partie qu'elle décrit — sans quoi elle disparaîtrait de toute
 * lecture autre que la sienne, y compris de celle où on la cherche.
 *
 * @returns {object|null} `null` quand le nom ne donne aucune clé lisible
 */
export function definitionVersable({ label = "", definition = "" } = {}) {
  const nom = texte(label);
  const cle = normalizeZoneKey(nom);
  if (!nom || !cle) return null;

  const quoi = texte(definition);

  return {
    sujet: nom,
    valeur: quoi || nom,
    // Ce qui fait d'une donnée de base une **zone**. L'écran ne le devine pas
    // d'un libellé : « Zone A » n'est pas une zone parce qu'il commence par ces
    // deux mots, il l'est parce que quelqu'un l'a défini.
    zoneDefinition: true,
    zoneKey: cle,
    quoi: "Une partie de l'ouvrage, et ce qu'elle recouvre.",
    utilisation: "Les affirmations du projet peuvent ne valoir que pour elle. La retirer sort "
      + "du présent tout ce qui ne valait que là.",
    nature: NATURE.DONNEE_BASE,
    provenance: { type: PROVENANCE.DECISION, quoi: `saisie — ${ECRAN}` },
    statut: STATUT.RETENU,
    reference: `zone:${cle}`,
    zones: [],
    atelier: ECRAN
  };
}

/**
 * Le retrait d'une zone, prêt à être proposé.
 *
 * Une définition de plus, marquée `retiree`, qui périme la précédente. Elle
 * garde le libellé de la zone : « Bâtiment C » sans son nom ne se relirait pas,
 * et les affirmations qui la portent encore deviendraient incompréhensibles.
 *
 * Le **motif** entre avec elle. Une zone qui quitte le projet sort du présent
 * tout ce qu'elle portait ; ne pas dire pourquoi ferait disparaître des valeurs
 * sans raison lisible.
 */
export function retraitVersable({ label = "", motif = "" } = {}) {
  const nom = texte(label);
  const cle = normalizeZoneKey(nom);
  if (!nom || !cle) return null;

  const pourquoi = texte(motif);

  return {
    sujet: nom,
    valeur: pourquoi ? `Retirée du projet — ${pourquoi}` : "Retirée du projet",
    zoneDefinition: true,
    zoneKey: cle,
    retiree: true,
    quoi: "Une partie de l'ouvrage qui ne fait plus partie du projet.",
    utilisation: "Ce qui ne valait que pour elle quitte le présent, avec son motif — et reste "
      + "lisible dans l'histoire.",
    nature: NATURE.DONNEE_BASE,
    // Un retrait est **décidé**, pas constaté : quelqu'un a tranché que cette
    // partie ne fait plus partie du projet.
    provenance: { type: PROVENANCE.DECISION, quoi: `retrait — ${ECRAN}` },
    statut: STATUT.RETENU,
    reference: `zone:${cle}`,
    zones: [],
    atelier: ECRAN
  };
}

/**
 * Renommer une zone, c'est en définir une autre et retirer la première.
 *
 * La clé vient du nom : « Bâtiment C » et « Bâtiment Nord » sont deux clés, donc
 * deux zones. Sans le retrait, les deux vaudraient à la fois et le projet aurait
 * un bâtiment de trop.
 *
 * L'ordre compte : la nouvelle d'abord, le retrait ensuite. C'est ce qu'on lit
 * dans la proposition — « voici la zone, et voici celle qu'elle remplace ».
 */
export function renommageVersable({ ancien = "", label = "", definition = "" } = {}) {
  const neuve = definitionVersable({ label, definition });
  if (!neuve) return [];

  const avant = texte(ancien);
  if (!avant || normalizeZoneKey(avant) === normalizeZoneKey(label)) return [neuve];

  return [neuve, retraitVersable({ label: avant, motif: `renommée en « ${texte(label)} »` })].filter(Boolean);
}
