/**
 * Le contenu d'un fichier de mémoire, et qui l'a écrit.
 *
 * ## Deux lectures d'un même fichier
 *
 * GitHub pose la question qu'il fallait poser : « Code » ou « Blame ». Ce n'est
 * pas un réglage d'affichage, ce sont deux questions différentes.
 *
 * - **Code** — qu'est-ce que le projet tient pour vrai aujourd'hui ? On ne
 *   montre que ce qui vaut : ce qui a été remplacé n'est plus l'état, et le
 *   mêler ferait répondre « CF 1/2 h » et « CF 1 h » à la même question.
 * - **Blame** — qui a décidé cela, et quand ? Chaque ligne porte la proposition
 *   qui l'a versée, sa date et son signataire ; on clique, on arrive sur la
 *   proposition, on lit la discussion qui a mené là.
 *
 * La seconde est la raison d'être de cette mémoire. Une valeur sans son auteur
 * ni sa date n'est qu'un chiffre dans un tableur ; c'est la ligne de blâme qui
 * en fait une décision de projet.
 *
 * ## Ce qui n'apparaît pas dans le code, et pourquoi
 *
 * Une affirmation **remplacée** — elle a eu son heure, elle ne décrit plus
 * l'état. Elle reste lisible dans l'histoire de sa ligne, qui est l'endroit où
 * on la cherche : « depuis quand ne croit-on plus cela ? ».
 *
 * Une affirmation **écartée** — un refus est une information, mais ce n'est pas
 * une valeur du projet. Elle a sa section, à part, sous le code : la ranger avec
 * le reste ferait lire comme acquis ce que quelqu'un a refusé.
 */

import { zonesDeRangement, rangDeLaZone } from "./memoire-rangement.js";
import { domicilesDesNoms, rangementDuVersement } from "./memoire-domiciles.js";
import { versementsEclipses } from "./memoire-valeurs.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une affirmation vaut aujourd'hui. */
const VAUT = { ASSUMED: "assumed", REJECTED: "rejected" };

/**
 * Les fichiers d'un projet, tels que sa mémoire les dessine.
 *
 * Rien n'est inventé : un fichier existe parce qu'une affirmation s'y range. Un
 * dossier vide ne s'affiche pas — un projet neuf n'a pas encore de contraintes,
 * et lui montrer douze dossiers vides lui ferait croire à une perte.
 *
 * ## Un nom ne se range plus deux fois
 *
 * Le fichier ne se déduit plus du seul `{nature, domaine}` de l'affirmation :
 * c'est le **domicile de son nom** qui décide, fixé par le premier versement.
 * Sans cela, deux utilitaires donnaient deux domaines au même nom et « Profondeur
 * hors gel » vivait dans deux fichiers à la fois. Voir `memoire-domiciles.js` et
 * `docs/fondamentaux.md`, règle 10.
 *
 * @returns {{chemin: string[], fichier: string, lignes: object[], ecartees: object[]}[]}
 */
export function fichiersDeLaMemoire(assertions = []) {
  const parFichier = new Map();
  const domiciles = domicilesDesNoms(assertions);
  // Ce qu'un versement plus récent a remplacé sans le déclarer. Deux lignes
  // « batiment-a: 0,5 m » l'une sous l'autre, toutes deux « retenu », ne
  // disent pas deux choses : elles disent la même, deux fois.
  const eclipses = versementsEclipses(assertions);

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    // Ce qui a été remplacé n'est plus l'état. Il reste dans l'histoire de sa
    // ligne, qui est l'endroit où on le cherche.
    if (texte(assertion?.superseded_by)) continue;
    if (eclipses.has(texte(assertion?.id))) continue;

    const { chemin, extension } = rangementDuVersement(assertion, domiciles);

    const cle = `${chemin.join(" / ")}.${extension}`;
    if (!parFichier.has(cle)) {
      parFichier.set(cle, {
        chemin, extension,
        fichier: rangementDuVersement(assertion, domiciles).fichier,
        lignes: [], ecartees: []
      });
    }

    const entree = parFichier.get(cle);
    if (texte(assertion?.status) === VAUT.REJECTED) entree.ecartees.push(assertion);
    else entree.lignes.push(assertion);
  }

  return [...parFichier.values()].map((fichier) => ({
    ...fichier,
    lignes: fichier.lignes.sort(parSujet),
    ecartees: fichier.ecartees.sort(parSujet),
    // Les sections du fichier : « Toutes zones » d'abord, puis le découpage du
    // projet. Une affirmation qui vaut pour deux zones ouvre les deux.
    sections: sectionsDuFichier(fichier.lignes)
  }));
}

/**
 * Les sections d'un fichier, une par zone.
 *
 * Une affirmation qui vaut pour deux zones apparaît dans les deux sections. Ce
 * n'est pas une copie : c'est la même, vue de deux endroits, et l'effacer de
 * l'une la cacherait à qui lit cette zone-là.
 */
export function sectionsDuFichier(lignes = []) {
  const parZone = new Map();

  for (const assertion of Array.isArray(lignes) ? lignes : []) {
    for (const zone of zonesDeRangement({ zones: zonesLisibles(assertion) })) {
      if (!parZone.has(zone)) parZone.set(zone, { zone, lignes: [] });
      parZone.get(zone).lignes.push(assertion);
    }
  }

  return [...parZone.values()]
    .map((section) => ({ ...section, lignes: section.lignes.slice().sort(parSujet) }))
    .sort((gauche, droite) => rangDeLaZone(gauche.zone) - rangDeLaZone(droite.zone)
      || gauche.zone.localeCompare(droite.zone, "fr"));
}

/**
 * Les zones d'une affirmation, telles qu'on les affiche.
 *
 * La colonne `zones` de la base est normalisée — « escalier-b » — et le
 * `payload` garde ce que l'utilisateur a écrit. C'est celui-là qu'on montre :
 * un dossier nommé « escalier-b » se lit moins bien qu'« Escalier B ».
 */
export function zonesLisibles(assertion = {}) {
  const dites = assertion?.payload?.zones;
  if (Array.isArray(dites) && dites.length) return dites.map(texte).filter(Boolean);
  return (Array.isArray(assertion?.zones) ? assertion.zones : []).map(texte).filter(Boolean);
}

/** L'ordre d'un fichier : par sujet, pour qu'on retrouve une ligne au même endroit. */
function parSujet(gauche, droite) {
  return texte(gauche?.subject_key).localeCompare(texte(droite?.subject_key), "fr", { numeric: true });
}

/**
 * Les dossiers, avec ce qu'ils contiennent.
 *
 * C'est l'écran racine de la Mémoire : ce que le projet a relevé, ce qui
 * s'impose, ce qu'il suppose. Un dossier sans fichier n'y figure pas.
 *
 * On groupe sur le **dernier** morceau du chemin, pas sur le premier : le
 * premier est `Mémoire`, la racine de la branche, et grouper dessus rendait un
 * seul dossier « Mémoire » dans « Mémoire », avec tous les fichiers dessous.
 */
export function dossiersDeLaMemoire(assertions = []) {
  const dossiers = new Map();

  for (const fichier of fichiersDeLaMemoire(assertions)) {
    const nom = fichier.chemin[fichier.chemin.length - 1];
    if (!dossiers.has(nom)) dossiers.set(nom, { nom, fichiers: [], lignes: 0 });
    const dossier = dossiers.get(nom);
    dossier.fichiers.push(fichier);
    dossier.lignes += fichier.lignes.length;
  }

  return [...dossiers.values()];
}

/**
 * Qui a écrit une ligne, et quand.
 *
 * La proposition, son numéro, sa date, son signataire. C'est ce sur quoi on
 * clique pour arriver à la discussion qui a mené là — et c'est la question à
 * laquelle cette mémoire existe pour répondre.
 *
 * Une affirmation sans proposition vient d'une déclaration à la main, dans
 * l'écran Mémoire. Elle le dit plutôt que d'afficher un numéro vide.
 */
export function blameDeLaLigne(assertion = {}, auteurs = new Map()) {
  const numero = Number(assertion?.proposition_number) || null;
  const quand = texte(assertion?.decided_at);

  return {
    propositionId: texte(assertion?.proposition_id) || null,
    numero,
    // « déclarée à la main » plutôt qu'un numéro absent : une ligne sans
    // proposition n'est pas une ligne sans origine, c'est une ligne dont
    // l'origine est quelqu'un.
    intitule: numero ? `#P${numero}` : "déclarée à la main",
    quand: quand || null,
    // L'identifiant en plus du nom : c'est lui qui mène au portrait, et un nom
    // ne suffit pas à retrouver quelqu'un — deux personnes peuvent le partager.
    quiId: texte(assertion?.decided_by) || "",
    qui: texte(auteurs.get?.(texte(assertion?.decided_by))) || ""
  };
}

/**
 * Les gens qui ont écrit dans un fichier, du plus récent au plus ancien.
 *
 * On compte par **identifiant**, jamais par nom : deux personnes dont on ignore
 * le nom sont deux personnes.
 */
export function contributeursDuFichier(lignes = [], auteurs = new Map()) {
  const vus = new Map();

  const triees = [...(Array.isArray(lignes) ? lignes : [])].sort(
    (gauche, droite) => Date.parse(texte(droite?.decided_at)) - Date.parse(texte(gauche?.decided_at))
  );

  for (const ligne of triees) {
    const id = texte(ligne?.decided_by);
    if (!id || vus.has(id)) continue;
    vus.set(id, { id, nom: texte(auteurs.get?.(id)) || "auteur inconnu" });
  }

  return [...vus.values()];
}

/**
 * Le dernier versement qui a touché un ensemble de lignes.
 *
 * ## Pourquoi il s'affiche en haut
 *
 * GitHub met en tête de chaque dossier le dernier commit : qui, quoi, quand.
 * C'est la question qu'on se pose en arrivant — « qu'est-ce qui a bougé ? » —
 * et y répondre avant qu'on la pose évite d'ouvrir trois fichiers pour le
 * découvrir.
 *
 * Le message est le **titre de la proposition**, pas une phrase fabriquée : ce
 * qu'on lit ici doit être exactement ce qu'on relira sur la proposition, sinon
 * on cherche deux fois.
 *
 * @param {object[]} lignes les affirmations d'un fichier, d'un dossier, ou de tout
 * @param {object} [contexte]
 * @param {Map} [contexte.auteurs] identifiant → nom
 * @param {Map} [contexte.propositions] identifiant → la proposition
 * @returns {object|null} `null` quand rien n'a de date
 */
export function dernierVersementDe(lignes = [], { auteurs = new Map(), propositions = new Map() } = {}) {
  let derniere = null;
  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const quand = Date.parse(texte(ligne?.decided_at));
    if (!Number.isFinite(quand)) continue;
    if (!derniere || quand > Date.parse(texte(derniere.decided_at))) derniere = ligne;
  }
  if (!derniere) return null;

  const blame = blameDeLaLigne(derniere, auteurs);
  const proposition = propositions.get?.(texte(derniere.proposition_id)) ?? null;

  return {
    ...blame,
    // Le titre de la proposition tient lieu de message. À défaut — une
    // déclaration à la main —, on dit le sujet qu'elle portait : c'est ce
    // qu'un message aurait dit.
    message: texte(proposition?.title) || texte(derniere?.statement) || texte(derniere?.subject_key)
  };
}

/**
 * Ce que la mémoire a reçu, en chiffres.
 *
 * Le nombre de **versements**, pas de lignes : une proposition qui verse trente
 * contraintes est un acte, pas trente. C'est l'acte qu'on compte, comme on
 * compte des commits.
 */
export function versementsDeLaMemoire(assertions = []) {
  const actes = new Set();
  let plusRecent = null;

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    // Une déclaration à la main est un acte aussi : elle a un auteur et une
    // date. Elle se compte par sa ligne, faute de proposition qui la porte.
    actes.add(texte(assertion?.proposition_id) || `main:${texte(assertion?.id)}`);
    const quand = Date.parse(texte(assertion?.decided_at));
    if (Number.isFinite(quand) && (plusRecent === null || quand > plusRecent)) plusRecent = quand;
  }

  return { versements: actes.size, plusRecent: plusRecent === null ? null : new Date(plusRecent).toISOString() };
}

/**
 * L'histoire d'une ligne : ce qu'elle a valu, de la plus récente à la première.
 *
 * On remonte par `supersedes`, qui est écrit dans les deux sens au moment du
 * remplacement. Une histoire qui se reconstruirait par la date confondrait deux
 * affirmations versées le même jour sur le même sujet.
 */
export function histoireDeLaLigne(assertions = [], depuis = null) {
  const parId = new Map((Array.isArray(assertions) ? assertions : []).map((row) => [texte(row?.id), row]));
  const histoire = [];

  let courante = depuis;
  const vues = new Set();
  while (courante && !vues.has(texte(courante.id))) {
    vues.add(texte(courante.id));
    histoire.push(courante);
    courante = parId.get(texte(courante.supersedes)) ?? null;
  }

  return histoire;
}

/**
 * L'âge d'une ligne, en parts.
 *
 * GitHub colore la marge par ancienneté : ce qui vient d'être écrit est vif, ce
 * qui n'a pas bougé depuis des mois s'efface. C'est une information gratuite et
 * elle se lit sans y penser — sur une mémoire de projet, elle dit « ceci a été
 * décidé la semaine dernière, ceci tient depuis le début ».
 *
 * Dix parts, et non cinq : une échelle se lit d'autant mieux qu'elle a de
 * degrés, et dix tiennent dans une légende qu'on lit d'un coup d'œil.
 *
 * @returns {number} de 0 (le plus ancien du fichier) à 9 (le plus récent)
 */
export const PARTS_DANCIENNETE = 10;

export function chaleurDeLaLigne(assertion, { plusAncien = 0, plusRecent = 0 } = {}) {
  const dernier = PARTS_DANCIENNETE - 1;
  const quand = Date.parse(texte(assertion?.decided_at));
  if (!Number.isFinite(quand) || plusRecent <= plusAncien) return dernier;
  const part = (quand - plusAncien) / (plusRecent - plusAncien);
  return Math.max(0, Math.min(dernier, Math.round(part * dernier)));
}

/** Les bornes de temps d'un fichier, pour en colorer la marge. */
export function bornesDuFichier(lignes = []) {
  const dates = (Array.isArray(lignes) ? lignes : [])
    .map((ligne) => Date.parse(texte(ligne?.decided_at)))
    .filter((date) => Number.isFinite(date));

  if (!dates.length) return { plusAncien: 0, plusRecent: 0 };
  return { plusAncien: Math.min(...dates), plusRecent: Math.max(...dates) };
}
