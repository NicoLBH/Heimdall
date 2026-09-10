/**
 * Ce qu'une étude de spectre propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Comme partout : **rien n'entre jamais directement dans la mémoire du projet**
 * (`docs/fondamentaux.md`, règle 1). Ce fichier construit les lignes ; une
 * proposition les fait entrer, et quelqu'un la signe.
 *
 * ## Cinq lignes, et l'ordre compte
 *
 * | ce que c'est | où cela va | pourquoi |
 * | --- | --- | --- |
 * | **la classe de sol, l'importance, l'amortissement** | `donnees-de-base.ddb` | ce sont les choix du projet, et ils commandent la courbe |
 * | **l'appel** — l'agent, sa version, ce qu'il a lu | `*.ref` | c'est le raisonnement |
 * | **le spectre** — une ligne, huit colonnes | `*.ctr` | c'est ce que le projet retient |
 *
 * ## Ce qui n'est pas versé : la zone de sismicité
 *
 * Elle est **lue**, jamais posée ici. C'est `deduction_zone_sismique_georisques_V1`
 * qui l'établit, depuis la commune, et deux écrans qui poseraient le même sujet
 * en feraient deux valeurs concurrentes que personne n'arbitrerait. L'appel
 * enregistre en revanche **la valeur avec laquelle il a calculé** : c'est ce qui
 * permettra de dire, plus tard, que ce spectre a été tracé sur une zone que le
 * projet a changée depuis.
 *
 * ## Et la courbe ?
 *
 * Elle ne se verse pas. Quarante et un couples (T, Se) sont **entièrement
 * déterminés** par les huit paramètres de la ligne : les écrire serait écrire
 * deux fois la même chose, et la seconde copie divergerait au premier arrondi
 * (règle 4). L'écran la retrace depuis la ligne, à la demande.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT, AGENT } from "./memoire-en-texte.js";
import {
  AGENT_D_SPECTRE_ELASTIQUE_EC8_V1 as AGENT_SPECTRE,
  STRUCTURE_DU_SPECTRE,
  SUJET_AMORTISSEMENT,
  SUJET_CATEGORIE_IMPORTANCE,
  SUJET_CLASSE_DE_SOL,
  SUJET_SPECTRE,
  SUJET_ZONE_SISMIQUE
} from "../utilitaires/agent-spectre.js";
import { referenceOf, sortiesDeLAgent } from "../utilitaires/catalogue.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'atelier d'où ces lignes viennent. Il s'affiche sur chacune. */
export const ATELIER = "Spectre";

/**
 * Un nombre, écrit comme la mémoire écrit ses valeurs.
 *
 * Virgule décimale, et pas de zéros inutiles : « 1,35 » et non « 1,350000001 ».
 * Un spectre porte des valeurs de nature très différente — 0,03 s et 3 m/s² —,
 * et un nombre fixe de décimales rendrait l'un illisible ou l'autre faux.
 */
export function nombreEcrit(valeur) {
  // `Number(null)` vaut zéro, et un zéro est une valeur. Écarter l'absence
  // d'abord est ce qui empêche une accélération manquante de s'écrire
  // « 0 m/s² » — un spectre plat, énoncé comme un fait.
  if (valeur === null || valeur === undefined || texte(valeur) === "") return "";
  const n = Number(valeur);
  if (!Number.isFinite(n)) return "";
  return String(Number(n.toFixed(4))).replace(".", ",");
}

/**
 * Ce que le projet a saisi, tel qu'il entre dans l'appel.
 *
 * L'écran porte des libellés — « Catégorie d'importance II » —, l'appel attend
 * des codes. La normalisation vit dans le module du spectre, pas ici : deux
 * façons de lire « II » finiraient par n'être pas d'accord.
 */
export function entreesDuSpectre(saisie = {}) {
  return {
    zoneSismique: texte(saisie.zoneSismique),
    soilClass: texte(saisie.soilClass),
    importanceCategory: texte(saisie.importanceCategory),
    dampingRatio: texte(saisie.dampingRatio)
  };
}

/**
 * La ligne du spectre, telle qu'elle se verse.
 *
 * Prise **des valeurs calculées**, pas recalculée ici : ce fichier ne connaît
 * aucune loi, et en recopier une en ferait une seconde qui divergerait.
 */
export function ligneDuSpectre(dimensionnement = null) {
  if (!dimensionnement) return null;

  const ligne = {};
  for (const colonne of STRUCTURE_DU_SPECTRE) {
    // `gammaI` s'appelle `gl` dans le module de calcul : le nom qui compte est
    // celui de la déclaration, et la correspondance se fait ici, une fois.
    const brut = colonne.cle === "gammaI" ? dimensionnement.gl : dimensionnement[colonne.cle];
    ligne[colonne.cle] = nombreEcrit(brut);
  }

  // Une ligne dont l'accélération manque n'est pas un spectre : la zone n'a pas
  // été reconnue, et rendre sept colonnes sur huit ferait passer une lacune pour
  // une courbe.
  return ligne.ag ? ligne : null;
}

/** Comment le spectre se dit en une phrase, sur sa ligne de mémoire. */
export function phraseDuSpectre(ligne = null) {
  if (!ligne) return "";
  return `ag = ${ligne.ag} m/s² · S = ${ligne.S} · TB/TC/TD = ${ligne.TB}/${ligne.TC}/${ligne.TD} s`;
}

/** Les trois choix du projet, dans l'ordre où l'écran les pose. */
const ENTREES_VERSABLES = [
  {
    sujet: SUJET_CLASSE_DE_SOL, cle: "soilClass", reference: "spectre:classe-de-sol",
    quoi: "La classe de sol EC8 du terrain : comment il amplifie la secousse.",
    utilisation: "Elle commande le paramètre de sol S et les trois périodes du spectre."
  },
  {
    sujet: SUJET_CATEGORIE_IMPORTANCE, cle: "importanceCategory", reference: "spectre:importance",
    quoi: "La catégorie d'importance de l'ouvrage : ce que l'on accepte de perdre.",
    utilisation: "Elle donne le coefficient γI, qui majore l'accélération de référence."
  },
  {
    sujet: SUJET_AMORTISSEMENT, cle: "dampingRatio", reference: "spectre:amortissement",
    quoi: "L'amortissement visqueux retenu pour l'ouvrage, en pourcentage.",
    utilisation: "Il donne la correction η, qui abaisse le spectre quand l'ouvrage dissipe plus de 5 %."
  }
];

/**
 * Les entrées du spectre, prêtes à être proposées.
 *
 * Ce sont des **décisions** : personne ne les mesure ni ne les déduit. Quelqu'un
 * a retenu une classe de sol en attendant l'étude géotechnique, et c'est
 * exactement le genre de chose qu'on rediscute six mois plus tard.
 */
export function entreesVersables(saisie = {}, zone = "") {
  const dites = entreesDuSpectre(saisie);

  return ENTREES_VERSABLES.map((entree) => {
    const valeur = texte(dites[entree.cle]);
    if (!valeur) return null;

    return {
      sujet: entree.sujet,
      // L'amortissement est un pourcentage : « 5 » seul se lirait comme un
      // nombre sans échelle, et personne ne saurait si c'est 5 % ou 5 ‰.
      valeur: entree.cle === "dampingRatio" ? `${valeur.replace(".", ",")} %` : valeur,
      quoi: entree.quoi,
      utilisation: entree.utilisation,
      nature: NATURE.DONNEE_BASE,
      domaine: AGENT_SPECTRE.domaine,
      provenance: { type: PROVENANCE.DECISION, quoi: `saisie dans l'Atelier — ${ATELIER}` },
      statut: STATUT.RETENU,
      reference: entree.reference,
      zones: texte(zone) ? [texte(zone)] : [],
      atelier: ATELIER
    };
  }).filter(Boolean);
}

/** Ce que l'appel a lu du projet, avec la valeur lue, à la date de l'appel. */
function lecturesDeLAppel(saisie = {}) {
  const dites = entreesDuSpectre(saisie);
  const valeurs = {
    [SUJET_ZONE_SISMIQUE]: dites.zoneSismique,
    [SUJET_CLASSE_DE_SOL]: dites.soilClass,
    [SUJET_CATEGORIE_IMPORTANCE]: dites.importanceCategory,
    [SUJET_AMORTISSEMENT]: dites.dampingRatio ? `${dites.dampingRatio.replace(".", ",")} %` : ""
  };

  return AGENT_SPECTRE.lit
    .map((lue) => ({ sujet: texte(lue?.sujet), valeur: texte(valeurs[texte(lue?.sujet)]) }))
    .filter((lue) => lue.sujet);
}

/**
 * L'appel lui-même, versé comme la fonction qu'il est.
 *
 * `referentiel: true` le range dans un `.ref` : c'est du raisonnement. Et
 * `agent-D` dit qu'il est déterministe — mêmes entrées, même courbe —, donc
 * qu'il se rejoue pour vérifier.
 */
export function appelVersable(saisie = {}, ligne = null, zone = "") {
  if (!ligne) return null;

  return {
    sujet: AGENT_SPECTRE.libelle,
    valeur: SUJET_SPECTRE,
    referentiel: true,
    agent: {
      genre: AGENT.D,
      utilitaire: AGENT_SPECTRE.nom,
      version: AGENT_SPECTRE.version,
      lit: AGENT_SPECTRE.lit.map((lue) => texte(lue?.sujet)).filter(Boolean),
      ecrit: [{ sujet: SUJET_SPECTRE }]
    },
    quoi: AGENT_SPECTRE.quoi,
    utilitaire: referenceOf(AGENT_SPECTRE),
    lectures: lecturesDeLAppel(saisie),
    nature: null,
    domaine: AGENT_SPECTRE.domaine,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${AGENT_SPECTRE.libelle} — ${referenceOf(AGENT_SPECTRE)}` },
    source: AGENT_SPECTRE.source,
    reference: `agent:${referenceOf(AGENT_SPECTRE)}`,
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * Le spectre, prêt à être proposé.
 *
 * Une **contrainte** : le texte le fixe. Personne ne négocie un spectre — on
 * corrige ses entrées si elles sont fausses, ce qui est un autre geste.
 */
export function spectreVersable(ligne = null, zone = "", saisie = {}) {
  if (!ligne) return null;

  const declaree = sortiesDeLAgent(AGENT_SPECTRE)[0] ?? {};

  return {
    sujet: SUJET_SPECTRE,
    valeur: phraseDuSpectre(ligne),
    tableau: [ligne],
    structure: declaree.structure ?? STRUCTURE_DU_SPECTRE,
    quoi: declaree.quoi,
    utilisation: declaree.utilisation,
    nature: NATURE.CONTRAINTE,
    domaine: AGENT_SPECTRE.domaine,
    source: AGENT_SPECTRE.source,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${AGENT_SPECTRE.libelle} — ${referenceOf(AGENT_SPECTRE)}` },
    statut: STATUT.RETENU,
    utilitaire: referenceOf(AGENT_SPECTRE),
    lectures: lecturesDeLAppel(saisie),
    reference: "spectre:elastique",
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * Toutes les lignes d'une étude de spectre, dans l'ordre de la chaîne.
 *
 * Les choix du projet d'abord, l'appel ensuite, la courbe enfin.
 *
 * @param {object} options
 * @param {object} options.saisie ce que l'écran porte
 * @param {object} options.dimensionnement ce que le module du spectre a rendu
 */
export function lignesVersables({ saisie = {}, dimensionnement = null, zone = "" } = {}) {
  const ligne = ligneDuSpectre(dimensionnement);

  return [
    ...entreesVersables(saisie, zone),
    appelVersable(saisie, ligne, zone),
    spectreVersable(ligne, zone, saisie)
  ].filter(Boolean);
}
