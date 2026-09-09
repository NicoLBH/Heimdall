/**
 * La chaîne d'une variante : ce qui découle de quoi, étape par étape.
 *
 * ## Le défaut qu'on ferme
 *
 * Le résultat d'une variante s'affichait en liste : la valeur essayée, puis les
 * valeurs recalculées, l'une sous l'autre, du même poids. Rien ne disait que la
 * troisième découlait de la deuxième et la deuxième de la première — et c'est
 * exactement ce qui a fait qu'un enchaînement correct a été lu comme s'il ne
 * s'était rien passé.
 *
 * Le lien de cause est l'information principale d'une variante. C'est même la
 * seule chose qu'un écran de variante a de plus qu'un tableur.
 *
 * ## Ce que chaque étape dit
 *
 * Ce qu'elle **lit** et ce qu'elle **écrit**. Les entrées viennent de ce que
 * l'utilitaire a déclaré dans son `lit` : elles ne sont pas devinées de la
 * chaîne, et un utilitaire qui déclare mal se voit ici. Les sorties sont le
 * sujet que l'étape a réécrit.
 *
 * ## L'ordre est celui du rejeu, et il ne se réordonne pas
 *
 * `rejouerLesUtilitaires` reprend d'abord les utilitaires, puis les fonctions
 * natives sur ce que les premiers viennent d'établir. Les lignes arrivent donc
 * déjà dans l'ordre de la chaîne. Les retrier ici — par nom, par domaine —
 * romprait le seul lien qu'on cherche à montrer.
 */

import { utilitaireByReference } from "../utilitaires/catalogue.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les tons possibles d'une étape. Les mêmes que le chemin d'une exécution. */
export const TON = { NEUTRE: "neutral", TENU: "ok", DOUTE: "warn", ROMPU: "error" };

/** L'accord d'un mot avec son nombre. Pas de « 1 valeurs » dans un schéma. */
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/** Ce qu'un utilitaire a déclaré lire, par son nom de sujet. */
function sujetsLus(reference) {
  const outil = utilitaireByReference(texte(reference));
  return (Array.isArray(outil?.lit) ? outil.lit : []).map((entree) => texte(entree?.sujet)).filter(Boolean);
}

/**
 * La chaîne d'une variante, prête pour `renderEnchainement`.
 *
 * @param {object} rendu ce que `consequencesDeLaVariante` a rendu
 * @param {{sujet: string, valeur: string, essaye: string}} depart ce qu'on essaie
 * @returns {object[]} les étapes, dans l'ordre où elles se sont suivies
 */
export function enchainementDeLaVariante(rendu = null, depart = null) {
  if (!rendu?.ok) return [];

  const etapes = [];
  const essai = texte(depart?.sujet);

  if (essai) {
    etapes.push({
      id: "depart",
      label: "Ce que vous essayez",
      detail: `${texte(depart?.valeur) || "—"} → ${texte(depart?.essaye) || "—"}`,
      tone: TON.NEUTRE,
      icon: "beaker",
      sorties: [essai]
    });
  }

  for (const ligne of rendu.recalculees ?? []) {
    const bouge = Boolean(ligne?.valeurABouge || ligne?.reservesOntBouge);
    etapes.push({
      id: `recalculee:${texte(ligne?.assertion?.id) || texte(ligne?.sujet)}`,
      label: texte(ligne?.utilitaire) || "Utilitaire",
      // Ce qu'elle a fait, pas ce qu'elle vaut : la valeur se lit dans le
      // tableau à côté, et la répéter ici ferait deux vérités à tenir.
      detail: bouge ? "a recalculé" : "a relu, sans changement",
      tone: TON.NEUTRE,
      icon: bouge ? "sync" : "check",
      entrees: sujetsLus(ligne?.utilitaire),
      sorties: [texte(ligne?.sujet)].filter(Boolean)
    });
  }

  const rejouees = rendu.rejouees ?? [];
  if (rejouees.length) {
    etapes.push({
      id: "rejouees",
      label: `${rejouees.length} ${accorde(rejouees.length, "règle du projet rejouée", "règles du projet rejouées")}`,
      detail: "évaluées sur les nouvelles valeurs",
      tone: TON.NEUTRE,
      icon: "checklist",
      // Les conclusions, nommées : « 3 règles rejouées » sans dire lesquelles
      // laisserait chercher lesquelles dans le tableau.
      sorties: rejouees.map((ligne) => texte(ligne?.sujet)).filter(Boolean)
    });
  }

  const aRevoir = rendu.aRevoir ?? [];
  if (aRevoir.length) {
    etapes.push({
      id: "a-revoir",
      label: `${aRevoir.length} à revérifier`,
      detail: "reposent sur ce qui vient de bouger, et nous ne savons pas les rejouer",
      tone: TON.DOUTE,
      icon: "alert",
      entrees: aRevoir.map((ligne) => texte(ligne?.sujet)).filter(Boolean)
    });
  }

  const refusees = rendu.relectures?.refusees ?? [];
  if (refusees.length) {
    etapes.push({
      id: "refusees",
      label: `${refusees.length} ${accorde(refusees.length, "utilitaire n'a pas répondu", "utilitaires n'ont pas répondu")}`,
      detail: "leur valeur d'aujourd'hui reste affichée",
      tone: TON.ROMPU,
      icon: "stop-alert",
      entrees: refusees.map((ligne) => texte(ligne?.sujet)).filter(Boolean)
    });
  }

  // Une seule étape n'est pas une chaîne : « ce que vous essayez », seul, ne
  // montre aucun enchaînement et occuperait une colonne pour rien.
  return etapes.length > 1 ? etapes : [];
}
