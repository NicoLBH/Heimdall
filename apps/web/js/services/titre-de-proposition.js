/**
 * Comment une proposition d'affirmations se nomme.
 *
 * ## Le défaut, mesurable
 *
 * Vingt-cinq propositions intitulées « Fondations superficielles —
 * dimensionnement » ou « Incendie — étude du 6 septembre 2026 ». Six mois plus
 * tard, la liste ne dit plus rien, et retrouver *la* proposition qui a descendu
 * les massifs demande de les ouvrir une à une.
 *
 * ## Pourquoi un modèle ici, et pas dans `proposition-title.js`
 *
 * Ce voisin nomme un **lot de documents** sans modèle, et le dit : « faire
 * appeler un LLM pour assembler trois nombres serait payer cher une phrase qu'on
 * sait écrire ». C'est juste — là-bas, trois natures, un émetteur et une période
 * suffisent, et la phrase s'assemble.
 *
 * Ici la matière n'est pas dénombrable. Ce qui distingue deux propositions
 * d'affirmations, c'est **ce qui a changé et pourquoi cela compte** — et cela ne
 * se déduit pas de quatre compteurs. Les deux chemins restent donc séparés, et
 * aucun des deux n'a à devenir l'autre.
 *
 * ## Ce que le modèle reçoit, et ce qu'il ne reçoit pas
 *
 * Le **diff**, et rien d'autre : ni la mémoire entière, ni les documents, ni la
 * conversation avec le copilote — celle-là ne sort jamais (règle 3). Ce qui
 * n'est pas nécessaire à la phrase ne part pas : c'est moins de jetons, et
 * surtout moins de matière à reprendre par erreur.
 *
 * Les lignes **identiques** ne partent pas non plus. Elles comptent dans le
 * tableau — « on l'affiche quand même » —, mais elles ne disent rien de ce qui
 * change, et une ligne inchangée dans un titre serait une fausse piste. Leur
 * nombre part, lui : c'est une information sur le lot, pas sur un sujet.
 *
 * ## Ce qu'il ne décide pas
 *
 * Rien. Il propose un titre et un résumé, marqués comme proposés, dans un champ
 * qu'on corrige avant d'ouvrir la proposition. Et il ne produit aucune valeur —
 * ce n'est pas seulement demandé dans la consigne, c'est **vérifié au serveur**,
 * qui refuse une rédaction portant un chiffre absent du diff. La consigne, elle,
 * ne quitte pas le serveur.
 *
 * ## Pourquoi l'appel vit à côté, et pas ici
 *
 * `titre-de-proposition-supabase.js` porte le `fetch`. La coupure n'est pas un
 * rangement : `auth.js` charge le client Supabase par https, et un fichier qui
 * l'importe ne s'ouvre plus dans un test Node. Ce qui décide de la phrase — ce
 * qui part, ce qui reste, quand on ne paie pas — est ici, et se teste.
 */

import { CHANGEMENT } from "./proposition-avant-apres.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Au-delà, on n'envoie plus le détail.
 *
 * Une proposition de deux cents lignes ne se résume pas mieux parce qu'on les
 * envoie toutes : le titre porte sur ce qui domine, et le reste se lit dans le
 * tableau. Ce qu'on ne montre pas est **compté**, jamais tu (règle 5) — sans
 * quoi le modèle nommerait un lot en croyant l'avoir vu en entier.
 */
export const MAX_LIGNES = 40;

/** Ce que le modèle a le droit de savoir d'une ligne du tableau. */
const ligneEnvoyee = (ligne) => ({
  sujet: texte(ligne?.sujet),
  domaine: texte(ligne?.domaineLabel),
  avant: texte(ligne?.avant),
  apres: texte(ligne?.apres),
  zones: Array.isArray(ligne?.zones) ? ligne.zones.map(texte).filter(Boolean) : [],
  changement: texte(ligne?.changement)
});

/**
 * Les faits d'un diff, tels qu'on les met sous les yeux du modèle.
 *
 * @param {{lignes: object[], compte: object, memoireLue: boolean}} tableau
 *   ce que `tableauAvantApres` a rendu
 * @returns {{lignes: object[], compte: object, omises: number, memoireLue: boolean}}
 */
export function faitsDuDiff(tableau = null, { max = MAX_LIGNES } = {}) {
  const toutes = (Array.isArray(tableau?.lignes) ? tableau.lignes : [])
    .filter((ligne) => texte(ligne?.changement) !== CHANGEMENT.IDENTIQUE);

  return {
    lignes: toutes.slice(0, max).map(ligneEnvoyee),
    omises: Math.max(0, toutes.length - max),
    compte: {
      nouveau: Number(tableau?.compte?.nouveau) || 0,
      correction: Number(tableau?.compte?.correction) || 0,
      retrait: Number(tableau?.compte?.retrait) || 0,
      identique: Number(tableau?.compte?.identique) || 0
    },
    // Sans mémoire lue, toutes les lignes se ressemblent : pas de « avant », et
    // rien qui distingue une correction d'une entrée nouvelle. Le modèle doit le
    // savoir, sinon il écrira « ajoute » là où le projet corrige.
    memoireLue: tableau?.memoireLue === true
  };
}

/**
 * Vrai si ce diff mérite qu'on paie une phrase.
 *
 * Une seule ligne se nomme d'elle-même — « Zone de neige : A1 → A2 » est déjà
 * le meilleur titre possible, et un modèle ne ferait que le rallonger. Et un
 * diff sans mémoire lue n'a pas de « avant » : la phrase serait écrite sur la
 * moitié de l'information.
 */
export function meriteUneRedaction(faits = null) {
  return Boolean(faits?.memoireLue) && (faits?.lignes ?? []).length > 1;
}
