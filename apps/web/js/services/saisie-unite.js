/**
 * Taper un nombre dans l'unité du projet, et pas dans une autre.
 *
 * ## Le défaut qu'on ferme
 *
 * La mémoire porte « 0,466 m ». On essayait une variante en tapant « 8 », et
 * l'écran affichait `0,466 m → 8`. Le calcul, lui, lisait huit **mètres** —
 * parce qu'il ne pouvait rien lire d'autre. Cette fois c'était le bon sens ;
 * rien ne le garantissait. « 80 » tapé en pensant centimètres serait lu quatre-
 * vingts mètres, sans un mot, et la variante rendrait un résultat que personne
 * ne pourrait soupçonner d'être faux.
 *
 * ## Imposer plutôt que convertir
 *
 * On aurait pu accepter n'importe quelle unité et convertir. C'est un autre
 * métier : kN et tonnes, mètres et centimètres, chacun avec ses écritures et ses
 * pièges, et une table de conversion est une seconde vérité qui divergera
 * (règle 4). **L'unité de la valeur de départ s'impose**, et elle ne se tape
 * pas : elle s'écrit toute seule, à droite de ce qu'on frappe.
 *
 * Le champ montre donc « 8 m » quand on a tapé « 8 », « 80 m » au caractère
 * suivant, « 800 m » ensuite. On voit l'unité pendant qu'on écrit, ce qui est le
 * seul moment où elle peut encore corriger une intention.
 *
 * ## Ce qu'on ne fait pas
 *
 * On ne refuse rien et on ne corrige rien après coup : un champ qui refuse la
 * frappe s'utilise mal, et un message d'erreur arrive après la faute. La valeur
 * est simplement **toujours** écrite dans l'unité du projet — il n'y a pas
 * d'instant où elle ne l'est pas.
 *
 * Une valeur de départ sans unité — « 3e famille B », « A2 » — n'impose rien :
 * le champ redevient un champ de texte. Toutes les valeurs du socle ne sont pas
 * des mesures, et coller « m » derrière une catégorie serait absurde.
 */

import { couperLUnite } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'unité qu'une valeur de départ impose, ou `""` quand elle n'en a pas. */
export function uniteImposee(valeur) {
  return couperLUnite(valeur).unite;
}

/** Un motif qui cherche ce texte-là, et rien d'autre. */
function echappe(brut) {
  return brut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ce que le champ doit afficher après cette frappe, et où mettre le curseur.
 *
 * Le curseur se pose **avant l'unité** : sans cela, la frappe suivante
 * s'écrirait derrière le « m » et le champ se remplirait à l'envers.
 *
 * Un champ vidé reste vide. Y laisser « m » tout seul empêcherait de l'effacer,
 * et donnerait une unité sans valeur — ce qui ne veut rien dire.
 *
 * @param {string} saisi ce que le champ contient à l'instant
 * @param {string} unite l'unité imposée, `""` pour n'en imposer aucune
 * @returns {{texte: string, caret: number}}
 */
export function frappeAvecUnite(saisi = "", unite = "") {
  const brut = String(saisi ?? "");
  const marque = texte(unite);
  if (!marque) return { texte: brut, caret: brut.length };

  // L'unité déjà écrite ne compte pas comme une frappe : elle vient de nous.
  const sansUnite = brut.replace(new RegExp(`\\s*${echappe(marque)}\\s*$`, "i"), "");
  // Ce qui reste d'un nombre. Les lettres tombent : elles ne peuvent être qu'une
  // unité qu'on essaie de taper à la main, et c'est justement ce qu'on impose.
  const nombre = sansUnite.replace(/[^0-9.,+-]/g, "");

  if (!nombre) return { texte: "", caret: 0 };
  return { texte: `${nombre} ${marque}`, caret: nombre.length };
}

/**
 * La valeur qu'une variante essaie, écrite comme le projet l'écrit.
 *
 * C'est elle qui part au rejeu et qui s'affiche dans la mémoire sous variante.
 * Elle ne peut donc pas être « 8 » quand le projet écrit « 0,466 m » : les deux
 * se liraient côte à côte sans qu'on sache si l'une est huit mètres ou huit
 * centimètres.
 */
export function valeurEssayee(saisi = "", depart = "") {
  return frappeAvecUnite(saisi, uniteImposee(depart)).texte;
}
