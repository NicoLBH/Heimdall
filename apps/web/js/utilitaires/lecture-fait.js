/**
 * Ce que tout utilitaire lit d'un fait de contexte, de la même façon.
 *
 * Outil partagé, pas utilitaire — d'où le nom en tirets.
 *
 * Une règle unique le gouverne : **un fait qui ne dit pas sur quoi il a été
 * calculé est déclaré inconnu, pas sûr.** C'est le cas de tous ceux écrits avant
 * qu'on conserve les entrées ; les prendre pour certains rendrait une confiance
 * inventée, ce qu'on est précisément en train de corriger.
 */

import { RESERVE } from "./reserves.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les entrées conservées par le producteur du fait, ou `null` si aucune. */
export function entreesDe(fait = {}) {
  const entrees = fait?.fact_value?.inputs;
  return entrees && typeof entrees === "object" ? entrees : null;
}

/**
 * Les réserves que le producteur a nommées, comme un ensemble modifiable.
 *
 * Sans entrées ni réserves, l'ignorance est nommée plutôt que tue.
 */
export function reservesConservees(fait = {}) {
  const brutes = fait?.fact_value?.reserves;
  const nommees = Array.isArray(brutes) ? brutes.map((code) => String(code ?? "").trim()).filter(Boolean) : [];

  if (!entreesDe(fait) && nommees.length === 0) return new Set([RESERVE.ENTREES_INCONNUES]);
  return new Set(nommees);
}

/**
 * Les sujets du projet qu'un utilitaire déclare lire, dans l'ordre où il les lit.
 *
 * ## Pourquoi une déclaration, et pas un rapprochement de noms
 *
 * Un utilitaire calcule au serveur, sur des faits de contexte, et la contrainte
 * qu'il produit ne garde qu'un **nombre** : `inputs.altitude = 13`. Rien dans ce
 * nombre ne dit qu'il vient de la donnée de base « Altitude du site » que le
 * projet a versée. Aller le deviner en rapprochant « altitude » de « Altitude du
 * site » serait un lien qui a l'air établi et qui n'est qu'une ressemblance —
 * l'erreur exacte que l'étape 1 du plan a corrigée.
 *
 * Alors l'utilitaire le **dit**. `lit` est une déclaration, écrite dans son
 * fichier, relue comme du code et figée par sa version : « mon entrée `altitude`
 * est le sujet *Altitude du site* du projet ». C'est exactement ce que fait une
 * règle `.ref` quand elle écrit `sujet: "Profondeur hors gel"` dans une
 * condition — elle ne cite pas d'identifiant non plus, elle nomme un sujet, et
 * le versement le résout une fois pour toutes.
 *
 * Le résultat suit donc le même chemin que les lectures d'une règle : résolu au
 * versement, dans la zone, avec son rang, et figé. Un renommage ultérieur ne le
 * défait pas.
 *
 * ## Une lecture sans valeur reste une lecture
 *
 * Un utilitaire qui déclare lire l'altitude et qui n'a rien reçu a **quand même
 * lu** — il a lu du vide, et il a calculé quelque chose malgré tout. C'est le
 * trou du raisonnement, et il se compte. Le taire ferait passer pour complet un
 * calcul qui ne l'était pas.
 *
 * @returns {{sujet: string, valeur: string}[]}
 */
export function lecturesDeclarees(utilitaire = {}, fait = {}) {
  const declarees = Array.isArray(utilitaire?.lit) ? utilitaire.lit : [];

  return declarees
    .map((entree) => ({
      sujet: texte(entree?.sujet),
      valeur: typeof entree?.lire === "function" ? texte(entree.lire(fait)) : ""
    }))
    .filter((lecture) => lecture.sujet);
}
