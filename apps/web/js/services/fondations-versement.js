/**
 * Ce qu'une étude de fondations propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Comme pour l'incendie : **rien n'entre jamais directement dans la mémoire du
 * projet** (voir `docs/fondamentaux.md`, règle 1). Ce fichier construit les
 * lignes ; c'est une proposition qui les fait entrer, et quelqu'un la signe.
 *
 * ## Ce qui part, et sous quelle forme
 *
 * Une étude de fondations produit deux objets, et ils ne sont pas de même
 * nature :
 *
 * - **l'appel** — « on a dimensionné les massifs du bâtiment A avec
 *   `dimensionnement_fondations_superficielles V1`, à partir de la profondeur hors gel
 *   du projet ». C'est une **fonction native** : ses entrées, ses sorties et sa
 *   version s'écrivent, son corps ne s'écrit pas. Voir la règle 9 des
 *   fondamentaux, et `dimensionnement_fondations_superficielles_V1.js` ;
 * - **les cotes** — « la semelle File A fait 1,20 × 1,20 × 0,90 ». Cela vaut
 *   pour un bâtiment, se relit, se conteste, et commande du béton.
 *
 * Les deux partent ensemble, et pour la même raison que les règles de l'incendie
 * partent avec leurs exigences : une cote qui dit « ← calcul » sans que le
 * projet porte l'appel quelque part renvoie à rien. On ne saurait plus ni avec
 * quoi elle a été trouvée, ni ce qu'elle a lu, ni quoi refaire le jour où
 * l'altitude change.
 *
 * ## Pourquoi les cotes deviennent des affirmations
 *
 * Parce qu'elles décident. Un massif de 1,20 × 1,20 se retrouve sur les plans,
 * au quantitatif, dans le marché ; il commande un volume de béton et un
 * ferraillage. Les laisser dans l'écran de l'Atelier, c'est les laisser hors du
 * raisonnement — et le jour où la profondeur hors gel bouge, rien ne dit qu'elles
 * sont périmées. C'est exactement ce qu'on veut éviter.
 *
 * ## Ce qui ne part pas
 *
 * **Les entrées de saisie.** Charges, angle de frottement, enrobage, cotes de
 * butée : ce sont les paramètres de l'étude, pas des faits du projet. Les verser
 * remplirait la mémoire de trois cents lignes que personne ne relira et qui ne
 * décident de rien — et « une mémoire de projet ne garde pas que des valeurs »
 * ne veut pas dire qu'elle garde tout.
 *
 * **Ce qui n'a pas été calculé.** Une semelle dont le calcul a échoué n'a pas de
 * cotes vérifiées ; elle part quand même, avec sa vérification qui dit
 * « non calculée ». Taire une ligne du tableau ferait croire que le projet
 * compte un massif de moins.
 */

import { NATURE, DOMAIN } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { synthese } from "./fondations-etude.js";
import {
  DIMENSIONNEMENT_FONDATIONS_SUPERFICIELLES_V1 as OUTIL, SUJET_HORS_GEL
} from "../utilitaires/dimensionnement_fondations_superficielles_V1.js";
import { referenceOf } from "../utilitaires/catalogue.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'atelier d'où ces lignes viennent. Il s'affiche sur chacune. */
export const ATELIER = "Fondations superficielles";

/**
 * Un nombre, écrit comme le reste de l'application l'écrit.
 *
 * Une virgule décimale, et le nombre de décimales que la grandeur mérite : une
 * cote au centimètre, un volume au litre. Un `toFixed` uniforme donnerait des
 * `9,000` massifs, et une mémoire qui compte les massifs au millième se relit
 * mal.
 */
export function ecrire(valeur, decimales = 2) {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/**
 * Le nom d'un résultat, pour cette semelle-là.
 *
 * ## Pourquoi le nom porte la semelle
 *
 * « Section Lx » tout seul ne désigne rien dans un projet qui compte vingt
 * massifs : la mémoire s'adresse par sujet, et vingt sujets du même nom sont un
 * seul sujet qui change vingt fois de valeur. Le nom porte donc l'appui, comme
 * il porte déjà la zone — et la phrase se lit, ce qu'une clé technique ne ferait
 * pas.
 */
export function sujetDeLaSemelle(quoi, designation) {
  return `${texte(quoi)} de la semelle ${texte(designation)}`;
}

/**
 * Ce qu'un massif dimensionné apprend au projet.
 *
 * Sept faits, et pas un de plus : les trois cotes, l'arase — c'est elle que la
 * profondeur hors gel commande —, le nombre de massifs de ce type, le volume de
 * béton qu'ils font, et le verdict. Le reste du résultat du serveur est le
 * détail du calcul : il se relit dans l'Atelier, et n'a rien à décider.
 */
export function resultatsDeLaSemelle(ligne = {}) {
  const entrees = ligne.entrees ?? {};
  const nombre = (valeur) => {
    const n = Number.parseFloat(String(valeur ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : Number.isFinite(valeur) ? valeur : null;
  };

  const cote = (quoi, valeur, decimales = 2) => {
    const n = nombre(valeur);
    return n === null ? null : { sujet: sujetDeLaSemelle(quoi, ligne.designation), valeur: `${ecrire(n, decimales)} m` };
  };

  return [
    cote("Section Lx", entrees.sectionLx),
    cote("Section Ly", entrees.sectionLy),
    cote("Hauteur", entrees.hauteurLz),
    cote("Arase supérieure", entrees.araseSuperieure),
    {
      sujet: sujetDeLaSemelle("Nombre de massifs", ligne.designation),
      valeur: String(Math.max(0, Math.trunc(Number(ligne.nombre) || 0)))
    },
    {
      sujet: sujetDeLaSemelle("Volume de béton", ligne.designation),
      valeur: `${ecrire(ligne.volume?.total ?? 0, 2)} m3`
    },
    {
      sujet: sujetDeLaSemelle("Vérification", ligne.designation),
      // Trois états, jamais deux. « Non calculée » n'est ni vérifiée ni en
      // défaut : la confondre avec l'un des deux ferait passer un calcul qui n'a
      // pas eu lieu pour un verdict.
      valeur: ligne.verifiee === true ? "vérifiée" : ligne.verifiee === false ? "en défaut" : "non calculée",
      citee: true
    }
  ].filter(Boolean);
}

/**
 * Tout ce que l'appel a écrit, dans l'ordre du tableau.
 *
 * C'est la liste que la fonction native porte dans son `enregistre`, et c'est la
 * même qui devient des affirmations. Une seule liste, construite une fois : deux
 * listes finiraient par ne plus dire la même chose, et le fichier de code
 * annoncerait des cotes que la mémoire ne porterait pas.
 */
export function sortiesDeLEtude(semelles = [], resultats = []) {
  const { lignes, totaux } = synthese(semelles, resultats);
  const sorties = lignes.flatMap((ligne) => resultatsDeLaSemelle(ligne));

  // Le total, une fois pour la zone. C'est le chiffre qu'on cherche en premier
  // dans une étude de fondations, et le recomposer à la main depuis vingt
  // lignes est exactement le genre d'addition qu'on rate.
  if (lignes.length) {
    sorties.push({
      sujet: "Volume de béton des fondations superficielles",
      valeur: `${ecrire(totaux.volume, 2)} m3`
    });
  }
  return sorties;
}

/**
 * L'appel lui-même, versé comme la fonction native qu'il est.
 *
 * ## Ce que porte sa valeur, et ce qu'elle ne porte pas
 *
 * Le nombre de massifs, et rien d'autre. C'est la **taille de l'appel**, écrite
 * une seule fois. Y mettre « 6 vérifiés sur 7 » ferait une seconde vérité à côté
 * des verdicts que les lignes portent déjà, et les deux divergeraient au premier
 * recalcul qui n'aurait pas reversé le résumé.
 */
export function fonctionVersable(semelles = [], resultats = [], zone = "", { rappels = null } = {}) {
  const sorties = sortiesDeLEtude(semelles, resultats);
  if (!sorties.length) return null;

  const massifs = (Array.isArray(semelles) ? semelles : []).length;
  const portee = texte(zone) ? [texte(zone)] : [];

  // Ce qu'elle a lu du projet, avec la valeur qu'elle a lue. On l'écrit à la
  // date de l'appel plutôt que de renvoyer au catalogue : le jour où la V2 lira
  // autre chose, cette ligne-ci doit continuer de dire ce que la V1 a lu.
  const lectures = (Array.isArray(OUTIL.lit) ? OUTIL.lit : []).map((entree) => ({
    sujet: entree.sujet,
    valeur: entree.sujet === SUJET_HORS_GEL && rappels?.profondeurHorsGel?.valeur
      // La virgule décimale, comme partout ailleurs : la mémoire compare des
      // phrases, et « 0.99 m » ne se rapproche pas de « 0,99 m ».
      ? `${ecrire(rappels.profondeurHorsGel.valeur, 3)} m`
      : ""
  }));

  return {
    sujet: OUTIL.libelle,
    valeur: `${massifs} ${massifs > 1 ? "massifs" : "massif"}`,
    // `referentiel` la range dans un `.ref` : c'est du raisonnement, pas un fait
    // du projet. C'est aussi ce qui en fait une **fonction** pour le cerveau et
    // pour les compteurs — une fonction native reste une fonction.
    referentiel: true,
    native: {
      utilitaire: OUTIL.nom,
      version: OUTIL.version,
      lit: lectures.map((lecture) => lecture.sujet),
      ecrit: sorties.map((sortie) => ({ sujet: sortie.sujet, valeur: sortie.valeur }))
    },
    quoi: OUTIL.quoi,
    utilitaire: referenceOf(OUTIL),
    lectures,
    nature: null,
    domaine: OUTIL.domaine,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${OUTIL.libelle} — ${referenceOf(OUTIL)}` },
    source: OUTIL.source,
    reference: `native:${referenceOf(OUTIL)}`,
    zones: portee,
    atelier: ATELIER
  };
}

/**
 * Les cotes, prêtes à devenir des affirmations du projet.
 *
 * Elles renvoient à la fonction qui les a posées — `← calcul …` — et c'est par
 * là qu'on remonte : la fonction dit ce qu'elle a lu, ce qu'elle a lu dit d'où
 * il vient, et la chaîne va jusqu'à l'altitude du site.
 */
export function cotesVersables(semelles = [], resultats = [], zone = "") {
  const portee = texte(zone) ? [texte(zone)] : [];
  const { lignes } = synthese(semelles, resultats);

  // Le verdict de chaque massif, pour donner son statut à ses cotes. Une cote
  // dont le calcul dit qu'elle ne vérifie pas n'est pas « retenue » : le projet
  // ne la tient pas pour acquise, et l'écrire ainsi ferait passer un défaut
  // pour une décision.
  const verdicts = new Map(lignes.map((ligne) => [texte(ligne.designation), ligne.verifiee]));

  const statutDe = (sujet) => {
    const massif = [...verdicts.keys()].find((nom) => sujet.endsWith(`de la semelle ${nom}`));
    if (massif === undefined) return STATUT.RETENU;
    if (verdicts.get(massif) === true) return STATUT.RETENU;
    // « En défaut » se conteste, « non calculée » attend : deux états
    // différents, et les confondre ferait croire qu'on a regardé.
    return verdicts.get(massif) === false ? STATUT.CONTESTE : STATUT.EN_ATTENTE;
  };

  return sortiesDeLEtude(semelles, resultats).map((sortie) => ({
    sujet: sortie.sujet,
    valeur: sortie.valeur,
    nature: NATURE.CONTRAINTE,
    domaine: DOMAIN.STRUCTURE,
    source: OUTIL.source,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${OUTIL.libelle} — ${referenceOf(OUTIL)}` },
    statut: statutDe(sortie.sujet),
    reference: `fondations:${sortie.sujet}`,
    zones: portee,
    atelier: ATELIER
  }));
}

/**
 * Tout ce qu'une étude propose, dans l'ordre où la mémoire le lit.
 *
 * La fonction d'abord, ses cotes ensuite. C'est l'ordre du raisonnement, et
 * c'est celui qui rend la proposition lisible : on voit ce qui a décidé avant de
 * voir ce qui a été décidé.
 */
export function affirmationsDeLEtude(semelles = [], resultats = [], zone = "", options = {}) {
  const fonction = fonctionVersable(semelles, resultats, zone, options);
  if (!fonction) return [];
  return [fonction, ...cotesVersables(semelles, resultats, zone)];
}
