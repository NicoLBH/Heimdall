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
 *
 * ## Une file ne suffit pas : c'est un **arbre**
 *
 * Une valeur changée n'entraîne pas une suite : elle **fourche**. Changer la
 * commune change la zone de neige *et* la cote hors gel — deux branches, du même
 * rang —, et la cote hors gel change ensuite les fondations, un rang plus loin.
 * Dessiné en file, cela se lit « neige, puis hors gel, puis fondations », ce qui
 * est faux : la neige ne commande pas la cote.
 *
 * Le **rang** est donc calculé ici, et il ne se devine pas d'un ordre : une
 * étape est au rang *n + 1* du plus profond des sujets qu'elle **déclare lire**
 * et qu'une étape précédente vient d'écrire. Les arêtes existent déjà — le `lit`
 * de chaque utilitaire, la sortie de chaque étape ; il ne manquait que le
 * comptage.
 *
 * Une étape qui lit quelque chose que rien n'a écrit ici est au rang 1 : elle
 * découle de ce qu'on essaie, par un chemin qu'on ne voit pas. Le dire au rang 1
 * vaut mieux que de la ranger au hasard.
 */

import { agentByReference, utilitaireByReference } from "../utilitaires/catalogue.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les tons possibles d'une étape. Les mêmes que le chemin d'une exécution. */
export const TON = { NEUTRE: "neutral", TENU: "ok", DOUTE: "warn", ROMPU: "error" };

/** L'accord d'un mot avec son nombre. Pas de « 1 valeurs » dans un schéma. */
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/**
 * Le tronc : ni une branche, ni sous une branche.
 *
 * Ce qu'on essaie s'y trouve, et les récapitulatifs aussi. Un récapitulatif ne
 * découle pas d'une étape en particulier — « 3 à revérifier » repose sur *tout*
 * ce qui vient de bouger —, et le ranger au rang le plus profond l'aurait dessiné
 * sous la dernière branche, qui ne le commande pas. C'est le défaut même que
 * cette étape ferme, et il n'y a pas de raison de le rouvrir en bas du schéma.
 *
 * Au tronc, et venant en dernier, il se lit comme ce qu'il est : ce en quoi
 * l'ensemble des branches se rejoint.
 */
const RANG_DU_TRONC = 0;

/**
 * Ce qu'un appel a déclaré lire, par nom de sujet.
 *
 * Un utilitaire ou un agent : les deux portent un `lit`, et ce qui nous
 * intéresse ici est la déclaration, pas ce qu'elle décore. Un appel qu'on ne
 * connaît pas ne déclare rien — et son étape se rangera au rang 1, plutôt que de
 * se voir attribuer des entrées qu'elle n'a pas.
 */
function sujetsLus(reference) {
  const cle = texte(reference);
  const outil = utilitaireByReference(cle) ?? agentByReference(cle);
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

  /**
   * Qui a écrit quoi, et à quel rang. C'est de là que les branches se déduisent.
   *
   * Une étape qui lit un sujet écrit au rang 1 est au rang 2. Deux étapes qui
   * lisent le même sujet sont **sœurs**, du même rang : c'est exactement la
   * fourche qu'on cherche à montrer.
   */
  const ecritPar = new Map();
  const rangDe = new Map();

  if (essai) {
    etapes.push({
      id: "depart",
      rang: RANG_DU_TRONC,
      label: "Ce que vous essayez",
      detail: `${texte(depart?.valeur) || "—"} → ${texte(depart?.essaye) || "—"}`,
      tone: TON.NEUTRE,
      icon: "beaker",
      sorties: [essai]
    });
    ecritPar.set(cleDuSujet(essai), "depart");
    rangDe.set("depart", RANG_DU_TRONC);
  }

  for (const ligne of rendu.recalculees ?? []) {
    const bouge = Boolean(ligne?.valeurABouge || ligne?.reservesOntBouge);
    const id = `recalculee:${texte(ligne?.assertion?.id) || texte(ligne?.sujet)}`;
    const entrees = sujetsLus(ligne?.utilitaire);

    // Le rang : un de plus que le plus profond des sujets qu'elle lit et qu'une
    // étape d'ici a écrits. Rien de connu → rang 1 : elle découle de ce qu'on
    // essaie, par un chemin qu'on ne voit pas.
    const parents = entrees
      .map((sujet) => ecritPar.get(cleDuSujet(sujet)))
      .filter((parent) => parent !== undefined);
    const rang = parents.length
      ? Math.max(...parents.map((parent) => rangDe.get(parent) ?? 0)) + 1
      : 1;

    etapes.push({
      id,
      rang,
      // De qui elle découle : le plus profond de ses parents. Le dessin s'en
      // sert pour relier, et l'export pour se relire.
      parent: parents.length
        ? parents.reduce((a, b) => ((rangDe.get(a) ?? 0) >= (rangDe.get(b) ?? 0) ? a : b))
        : (essai ? "depart" : ""),
      label: texte(ligne?.utilitaire) || "Utilitaire",
      // Ce qu'elle a fait, pas ce qu'elle vaut : la valeur se lit dans le
      // tableau à côté, et la répéter ici ferait deux vérités à tenir.
      detail: bouge ? "a recalculé" : "a relu, sans changement",
      tone: TON.NEUTRE,
      icon: bouge ? "sync" : "check",
      entrees,
      sorties: [texte(ligne?.sujet)].filter(Boolean)
    });

    rangDe.set(id, rang);
    // Ce qu'elle vient d'écrire devient lisible pour les suivantes. C'est ce qui
    // fait descendre les fondations d'un rang sous la cote hors gel.
    for (const sortie of [texte(ligne?.sujet)].filter(Boolean)) ecritPar.set(cleDuSujet(sortie), id);
  }

  const rejouees = rendu.rejouees ?? [];
  if (rejouees.length) {
    etapes.push({
      id: "rejouees",
      rang: RANG_DU_TRONC,
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
      rang: RANG_DU_TRONC,
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
      rang: RANG_DU_TRONC,
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
