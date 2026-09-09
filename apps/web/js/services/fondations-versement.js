/**
 * Ce qu'une étude de fondations propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Comme pour l'incendie : **rien n'entre jamais directement dans la mémoire du
 * projet** (voir `docs/fondamentaux.md`, règle 1). Ce fichier construit les
 * lignes ; c'est une proposition qui les fait entrer, et quelqu'un la signe.
 *
 * ## Trois lignes, et pas une de plus
 *
 * Une étude de fondations produit trois objets, et il faut les trois :
 *
 * | ce que c'est | où cela va | pourquoi |
 * | --- | --- | --- |
 * | **les entrées** — un massif par ligne | `donnees-de-base.ddb` | c'est ce qui permet de refaire le calcul |
 * | **l'appel** — l'utilitaire, sa version, ses arguments | `structure.ref` | c'est le raisonnement |
 * | **le résultat** — le tableau de synthèse | `structure.ctr` | c'est ce que le projet retient |
 *
 * ## Ce que la première version faisait, et pourquoi c'était faux
 *
 * Elle dépliait les sorties : sept sujets par massif, quatre-vingts lignes de
 * cotes écrites **dans le fichier de code**. Trois choses en découlaient, et
 * chacune suffit :
 *
 * - le `.ref` portait les données du projet — ce qu'un `.ctr` existe pour
 *   porter — et l'on n'y lisait plus ni les entrées de la fonction ni la façon
 *   de l'appeler ;
 * - la mémoire comptait quatre-vingts sujets là où le métier en voit un, tous
 *   corrects et tous semblables, et aucun écran ne sait replier cela ;
 * - **les entrées n'étaient nulle part.** Le calcul est au serveur, ses sorties
 *   étaient en mémoire, et ce qu'il fallait pour le refaire n'existait qu'à
 *   l'écran de l'Atelier. Une variante d'altitude ne pouvait que marquer les
 *   fondations à refaire, jamais les refaire.
 *
 * Le tableau d'entrée versé est ce qui referme la boucle : `fondations-reprise.js`
 * le relit, y applique la nouvelle profondeur hors gel, redemande le calcul, et
 * rend le tableau d'après.
 *
 * ## Ce qui ne part toujours pas
 *
 * Le **détail du calcul** — les trois cent quatre-vingt-huit combinaisons, les
 * ratios intermédiaires, les vérifications une à une. Cela se relit dans
 * l'Atelier, cela ne décide de rien, et une mémoire de projet n'est pas un
 * journal de calcul.
 */

import { NATURE, DOMAIN } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { synthese } from "./fondations-etude.js";
import {
  DIMENSIONNEMENT_FONDATIONS_SUPERFICIELLES_V1 as OUTIL,
  SUJET_HORS_GEL, SUJET_DONNEES, SUJET_RESULTAT
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

function nombre(valeur) {
  const n = Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Le verdict d'un massif, en trois états et jamais deux. */
export function verdictDe(verifiee) {
  // « Non calculée » n'est ni vérifiée ni en défaut : la confondre avec l'un des
  // deux ferait passer un calcul qui n'a pas eu lieu pour un jugement.
  return verifiee === true ? "vérifiée" : verifiee === false ? "en défaut" : "non calculée";
}

/**
 * Le tableau des entrées, tel que le projet le conserve.
 *
 * Les entrées **telles que le calcul les reçoit**, sans mise en forme : c'est ce
 * qui doit repartir au serveur à l'identique le jour d'une reprise. Les mettre
 * en phrases ici obligerait à les relire, et une relecture est une occasion de
 * changer un chiffre sans le vouloir.
 */
export function tableauDesEntrees(semelles = []) {
  return (Array.isArray(semelles) ? semelles : []).map((semelle, rang) => ({
    designation: texte(semelle?.designation) || `Semelle ${rang + 1}`,
    nombre: Math.max(0, Math.trunc(Number(semelle?.nombre) || 0)),
    entrees: semelle?.entrees ?? {}
  }));
}

/**
 * Le tableau de synthèse, tel que le projet le retient.
 *
 * Une ligne par type de massif : ses cotes, son volume, son verdict. C'est ce
 * qui part aux plans et au quantitatif, et c'est tout ce dont on a besoin sans
 * rouvrir l'étude.
 */
export function tableauDuResultat(semelles = [], resultats = []) {
  const { lignes } = synthese(semelles, resultats);

  return lignes.map((ligne) => ({
    designation: ligne.designation,
    nombre: ligne.nombre,
    sectionLx: nombre(ligne.entrees?.sectionLx),
    sectionLy: nombre(ligne.entrees?.sectionLy),
    hauteur: nombre(ligne.entrees?.hauteurLz),
    arase: nombre(ligne.entrees?.araseSuperieure),
    volume: ligne.volume?.total ?? 0,
    verification: verdictDe(ligne.verifiee),
    ratio: ligne.ratio
  }));
}

/**
 * Ce qu'on lit d'un tableau de synthèse en une phrase.
 *
 * Les trois états séparés, jamais additionnés : « 10 massifs, 9 vérifiées »
 * laisserait croire qu'une seule est en défaut alors qu'elle n'a peut-être pas
 * été calculée du tout.
 */
export function phraseDuResultat(semelles = [], resultats = []) {
  const { totaux } = synthese(semelles, resultats);
  const accord = (compte, mot) => `${compte} ${mot}${compte > 1 ? "s" : ""}`;

  const etats = [
    totaux.verifiees ? accord(totaux.verifiees, "vérifiée") : "",
    totaux.enDefaut ? `${totaux.enDefaut} en défaut` : "",
    totaux.inconnues ? accord(totaux.inconnues, "non calculée") : ""
  ].filter(Boolean);

  const haute = assiseLaPlusHaute(semelles);
  const assise = haute === null ? "" : `, assise mini ${ecrire(haute, 2)} m`;

  return `${accord(totaux.massifs, "massif")}, ${ecrire(totaux.volume, 2)} m3 de béton${assise} — ${etats.join(", ")}`;
}

/**
 * L'assise du massif le moins enterré, sous le niveau fini.
 *
 * ## Pourquoi elle est dans la phrase
 *
 * Parce que c'est **la cote que la profondeur hors gel commande**, et que sans
 * elle une reprise se lisait comme si rien n'avait bougé : enterrer un massif ne
 * change ni son volume ni son verdict, et la phrase disait donc exactement la
 * même chose avant et après. Une variante qui annonce « recalculé » et montre
 * deux textes identiques apprend à ne plus la croire.
 *
 * La plus **haute** des assises, et non la moyenne : c'est celle-là que le gel
 * atteindrait, et c'est donc la seule qui décide.
 */
export function assiseLaPlusHaute(semelles = []) {
  const assises = (Array.isArray(semelles) ? semelles : [])
    .map((semelle) => {
      const arase = nombre(semelle?.entrees?.araseSuperieure) ?? 0;
      const hauteur = nombre(semelle?.entrees?.hauteurLz) ?? 0;
      return Math.abs(arase) + hauteur;
    })
    .filter((assise) => Number.isFinite(assise));

  return assises.length ? Math.min(...assises) : null;
}

/**
 * Le tableau d'entrée, prêt à devenir une donnée de base du projet.
 *
 * ## Pourquoi une donnée de base
 *
 * Parce que le projet la pose lui-même : personne d'extérieur ne l'impose,
 * aucune mesure ne l'établit, et elle est en amont de tout ce qu'on en déduira.
 * C'est aussi la nature dont le changement **se propage** — et c'est exactement
 * ce qu'on attend d'elle : la modifier doit marquer le résultat à refaire.
 */
export function entreesVersables(semelles = [], zone = "") {
  const table = tableauDesEntrees(semelles);
  if (!table.length) return null;

  const declaree = (Array.isArray(OUTIL.lit) ? OUTIL.lit : [])
    .find((entree) => entree.sujet === SUJET_DONNEES) ?? {};

  return {
    sujet: SUJET_DONNEES,
    // La taille du tableau, et rien d'autre. Y résumer son contenu ferait une
    // seconde vérité à côté des lignes, et les deux divergeraient.
    valeur: `${table.length} ligne${table.length > 1 ? "s" : ""}`,
    tableau: table,
    quoi: texte(declaree.quoi),
    utilisation: texte(declaree.utilisation),
    structure: declaree.structure ?? null,
    nature: NATURE.DONNEE_BASE,
    domaine: DOMAIN.STRUCTURE,
    provenance: { type: PROVENANCE.DECISION, quoi: `saisie dans l'Atelier — ${ATELIER}` },
    statut: STATUT.RETENU,
    reference: `fondations:entrees`,
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * L'appel lui-même, versé comme la fonction native qu'il est.
 *
 * Sa signature nomme ce qu'elle consomme, son appel montre ses arguments, et son
 * `enregistre` dit où le résultat est rangé. Un lecteur y trouve les quatre
 * réponses qu'il cherche — que consomme-t-elle, comment l'appeler, sous quelle
 * forme sort le résultat, où est-il — sans ouvrir l'Atelier.
 */
export function fonctionVersable(semelles = [], zone = "", { rappels = null } = {}) {
  if (!tableauDesEntrees(semelles).length) return null;

  // Ce qu'elle a lu du projet, avec la valeur lue. On l'écrit à la date de
  // l'appel plutôt que de renvoyer au catalogue : le jour où la V2 lira autre
  // chose, cette ligne-ci doit continuer de dire ce que la V1 a lu.
  const horsGel = rappels?.profondeurHorsGel?.valeur;
  const lectures = [
    { sujet: SUJET_HORS_GEL, valeur: horsGel ? `${ecrire(horsGel, 3)} m` : "" },
    { sujet: SUJET_DONNEES, valeur: `${semelles.length} ligne${semelles.length > 1 ? "s" : ""}` }
  ];

  return {
    sujet: OUTIL.libelle,
    // Ce qu'un appel « vaut » est ce qu'il a fait : le nombre de massifs qu'il a
    // dimensionnés. Les verdicts sont sur le résultat, et les redire ici ferait
    // deux vérités qui divergeraient au premier recalcul.
    valeur: `${semelles.length} massif${semelles.length > 1 ? "s" : ""}`,
    // `referentiel` la range dans un `.ref` : c'est du raisonnement, pas un fait
    // du projet. C'est aussi ce qui en fait une **fonction** pour le cerveau et
    // pour les compteurs — une fonction native reste une fonction.
    referentiel: true,
    native: {
      utilitaire: OUTIL.nom,
      version: OUTIL.version,
      lit: [SUJET_HORS_GEL, SUJET_DONNEES],
      ecrit: [{ sujet: SUJET_RESULTAT }]
    },
    quoi: OUTIL.quoi,
    utilitaire: referenceOf(OUTIL),
    lectures,
    nature: null,
    domaine: OUTIL.domaine,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${OUTIL.libelle} — ${referenceOf(OUTIL)}` },
    source: OUTIL.source,
    reference: `native:${referenceOf(OUTIL)}`,
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * Le tableau de synthèse, prêt à devenir ce que le projet retient.
 *
 * Il renvoie à la fonction qui l'a posé — `← calcul …` — et c'est par là qu'on
 * remonte : la fonction dit ce qu'elle a lu, ce qu'elle a lu dit d'où il vient,
 * et la chaîne va jusqu'à l'altitude du site.
 *
 * Son **statut** suit le tableau : « retenu » quand tout vérifie, « contesté »
 * dès qu'un massif est en défaut, « en attente » quand il en reste à calculer.
 * Un tableau dont un massif ne tient pas n'est pas acquis, et l'écrire ainsi
 * ferait passer un défaut pour une décision.
 */
export function resultatVersable(semelles = [], resultats = [], zone = "") {
  const table = tableauDuResultat(semelles, resultats);
  if (!table.length) return null;

  const enDefaut = table.some((ligne) => ligne.verification === "en défaut");
  const inconnues = table.some((ligne) => ligne.verification === "non calculée");

  return {
    sujet: SUJET_RESULTAT,
    valeur: phraseDuResultat(semelles, resultats),
    tableau: table,
    quoi: texte(OUTIL.rend?.quoi),
    utilisation: texte(OUTIL.rend?.utilisation),
    structure: OUTIL.rend?.structure ?? null,
    nature: NATURE.CONTRAINTE,
    domaine: DOMAIN.STRUCTURE,
    source: OUTIL.source,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${OUTIL.libelle} — ${referenceOf(OUTIL)}` },
    statut: enDefaut ? STATUT.CONTESTE : inconnues ? STATUT.EN_ATTENTE : STATUT.RETENU,
    reference: "fondations:resultat",
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * Tout ce qu'une étude propose, dans l'ordre où la mémoire le lit.
 *
 * Les entrées, l'appel, le résultat. C'est l'ordre du raisonnement : ce dont on
 * part, ce qui décide, ce qu'on retient.
 */
export function affirmationsDeLEtude(semelles = [], resultats = [], zone = "", options = {}) {
  return [
    entreesVersables(semelles, zone),
    fonctionVersable(semelles, zone, options),
    resultatVersable(semelles, resultats, zone)
  ].filter(Boolean);
}
