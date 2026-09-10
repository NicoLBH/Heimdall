/**
 * Trouver la valeur qu'on veut essayer, avec les mots qu'on a.
 *
 * ## Ce qui ne se trouvait pas
 *
 * La localisation se verse comme **un tableau à six colonnes**, et l'écran de
 * variante en offre six entrées : « commune », « code INSEE », « code postal »,
 * « adresse », « latitude », « longitude ». La recherche ne regardait que le nom
 * de l'entrée. Taper « localisation » ne ramenait donc **rien** — le mot n'est
 * le nom d'aucune colonne, il est celui du tableau qui les porte. Taper
 * « adresse » ramenait une colonne sur six, en laissant croire que le reste
 * n'existait pas.
 *
 * Deux manques, et ils se corrigent séparément :
 *
 * 1. **le tableau porteur se cherche aussi.** Une colonne s'appelle « adresse » ;
 *    ce qu'on cherche s'appelle « Localisation du projet ». C'est vrai de tous
 *    les tableaux, pas seulement de celui-ci : « drainage » doit ramener la
 *    colonne du tableau des fondations.
 * 2. **les mots qu'on emploie ne sont pas ceux qui sont écrits.** On dit « GPS »,
 *    « coordonnées », « où est le projet », « le terrain ». Aucun n'est écrit
 *    nulle part, et tous désignent la même chose.
 *
 * ## Pourquoi une table, et pas une recherche floue
 *
 * Une distance de Levenshtein ramènerait « localisation » sur « localisé » et
 * « ville » sur « villa ». Les synonymes sont **écrits**, ils se relisent, et le
 * jour où l'un ramène ce qu'il ne faut pas on sait lequel retirer. Ce qui n'est
 * pas déclaré ne se devine pas — c'est la même règle que pour les colonnes d'un
 * tableau.
 */

import { SUJET_LOCALISATION } from "../utilitaires/agents-climatiques.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Sans accents ni majuscules : on tape « ou » pour « où ». */
export function aplati(mot = "") {
  return texte(mot).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Les mots qui désignent un sujet sans l'écrire.
 *
 * Par sujet, et non par colonne : c'est l'endroit qu'on cherche, pas sa
 * latitude. Le nom du sujet vit à un seul endroit et s'importe (règle 10).
 */
export const SYNONYMES = {
  [SUJET_LOCALISATION]: [
    "localisation", "adresse", "ou", "lieu", "endroit", "situation", "site",
    "terrain", "parcelle", "commune", "ville", "gps", "coordonnees",
    "latitude", "longitude", "carte", "geolocalisation", "position"
  ]
};

/** Les synonymes d'un sujet, aplatis. Vide si le sujet n'en déclare pas. */
export function synonymesDuSujet(sujet = "") {
  return (SYNONYMES[texte(sujet)] ?? []).map(aplati);
}

/**
 * Ce qu'une entrée du socle donne à chercher.
 *
 * Trois rangs, et ils ne se valent pas — c'est ce qui décide de l'ordre :
 *
 * | rang | ce que c'est |
 * | --- | --- |
 * | `nom` | le nom de l'entrée, le nom de son tableau, son groupe |
 * | `synonyme` | les mots déclarés pour le sujet qui la porte |
 * | `quoi` | sa description |
 *
 * Chercher « vent » doit ramener les quatre cas de vent avant « c'est souvent ce
 * décalage qui… ». Et « localisation » doit ramener les six colonnes de la
 * localisation avant une phrase qui contient le mot.
 */
export function motsDeLEntree(entree = null) {
  const porteur = texte(entree?.assertion?.payload?.subject);

  return {
    nom: [entree?.sujet, entree?.champ?.groupe, porteur].map(aplati).filter(Boolean),
    synonyme: synonymesDuSujet(porteur),
    quoi: [entree?.quoi].map(aplati).filter(Boolean)
  };
}

/** À quel rang une entrée répond à la requête. `0` si elle n'y répond pas. */
export function rangDeLaReponse(entree = null, requete = "") {
  const dit = aplati(requete);
  if (!dit) return 1;

  const mots = motsDeLEntree(entree);
  if (mots.nom.some((mot) => mot.includes(dit))) return 3;
  // Un synonyme se reconnaît **en entier** : « ou » est un synonyme de la
  // localisation, et le chercher dans un texte ramènerait tout ce qui contient
  // « où », « pour », « couvert »…
  if (mots.synonyme.some((mot) => mot === dit || mot.startsWith(dit))) return 2;
  if (mots.quoi.some((mot) => mot.includes(dit))) return 1;
  return 0;
}

/**
 * Les valeurs qui répondent, les mieux nommées d'abord.
 *
 * L'ordre d'origine est conservé à rang égal : la liste du socle est déjà
 * rangée — les plus employées en tête —, et la retrier alphabétiquement ferait
 * chercher.
 */
export function valeursTrouvees(valeurs = [], requete = "") {
  const dites = Array.isArray(valeurs) ? valeurs : [];
  if (!aplati(requete)) return dites;

  return dites
    .map((valeur, rang) => ({ valeur, reponse: rangDeLaReponse(valeur, requete), rang }))
    .filter((entree) => entree.reponse > 0)
    .sort((gauche, droite) => droite.reponse - gauche.reponse || gauche.rang - droite.rang)
    .map((entree) => entree.valeur);
}
