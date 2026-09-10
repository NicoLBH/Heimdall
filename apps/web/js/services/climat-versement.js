/**
 * Ce qu'une étude climatique propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Comme partout : **rien n'entre jamais directement dans la mémoire du projet**
 * (`docs/fondamentaux.md`, règle 1). Ce fichier construit les lignes ; c'est une
 * proposition qui les fait entrer, et quelqu'un la signe.
 *
 * ## Ce qui manquait, et que ces lignes referment
 *
 * L'écran versait cinq valeurs, chacune seule. Aucune ne disait par quel appel
 * elle avait été obtenue, ni à partir de quelle commune, ni comment la refaire.
 * Résultat : le raisonnement climatique s'arrêtait à sa première ligne, et une
 * variante d'altitude rangeait tout ce qui en découlait « à revérifier » —
 * c'est-à-dire qu'elle rendait la main là où elle devait calculer.
 *
 * On verse donc, comme pour les fondations, ce qu'il faut pour **refaire** :
 *
 * | ce que c'est | où cela va | pourquoi |
 * | --- | --- | --- |
 * | **la localisation** — commune, INSEE, code postal | `donnees-de-base.ddb` | c'est l'entrée de toute la chaîne |
 * | **l'altitude** | `donnees-de-base.ddb` | second terme de la formule du hors gel |
 * | **les deux appels** — agent, version, ce qu'ils ont lu | `*.ref` | c'est le raisonnement |
 * | **les zones et la cote** | `*.ctr` | c'est ce que le projet retient |
 *
 * ## Deux appels, et non un
 *
 * Les zonages ne lisent qu'une commune ; la cote hors gel lit une altitude. Les
 * verser sous un seul appel ferait rejouer les tables communales à chaque mètre
 * d'altitude essayé, et l'écran de variante montrerait une dépendance qui
 * n'existe pas. Voir `utilitaires/agents-climatiques.js`.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT, AGENT } from "./memoire-en-texte.js";
import {
  AGENTS_CLIMATIQUES,
  SUJET_ALTITUDE,
  SUJET_LOCALISATION,
  STRUCTURE_DE_LA_LOCALISATION
} from "../utilitaires/agents-climatiques.js";
import { referenceOf, sortiesDeLAgent } from "../utilitaires/catalogue.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'atelier d'où ces lignes viennent. Il s'affiche sur chacune. */
export const ATELIER = "Neige, Vent & Gel";

/**
 * Un nombre, écrit comme la mémoire écrit ses mesures.
 *
 * La virgule décimale, et l'unité collée derrière. « 2.59 m » et « 2,59 m »
 * seraient deux écritures d'une même cote, et le diff d'un fichier les
 * signalerait comme une modification.
 */
export function mesure(valeur, decimales = 2, unite = "m") {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return "";
  const ecrit = n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return unite ? `${ecrit} ${unite}` : ecrit;
}

/**
 * La localisation telle qu'elle se verse : une ligne, quatre colonnes.
 *
 * Un tableau d'une seule ligne, et non quatre sujets. Une commune, son code
 * INSEE et son code postal ne se lisent pas séparément — c'est **un** endroit —,
 * et les éclater ferait quatre lignes de mémoire qu'aucun écran ne sait replier.
 */
export function ligneDeLaLocalisation(localisation = {}) {
  const ligne = {
    commune: texte(localisation.city ?? localisation.commune),
    codeInsee: texte(localisation.codeInsee ?? localisation.code_insee),
    codePostal: texte(localisation.postalCode ?? localisation.codePostal ?? localisation.postal_code),
    adresse: texte(localisation.address ?? localisation.adresse)
  };
  // Sans code INSEE, rien ne se calcule et rien ne se verse : le zonage d'une
  // commune homonyme serait une valeur fausse énoncée comme un fait.
  return ligne.codeInsee ? ligne : null;
}

/** Comment la localisation se dit en une phrase, sur sa ligne de mémoire. */
export function phraseDeLaLocalisation(ligne = null) {
  if (!ligne) return "";
  const nom = ligne.commune || "commune inconnue";
  return ligne.codePostal ? `${nom} (${ligne.codePostal}, INSEE ${ligne.codeInsee})` : `${nom} (INSEE ${ligne.codeInsee})`;
}

/**
 * La localisation, prête à être proposée comme donnée de base.
 *
 * Sa provenance est une **décision** : personne ne l'a mesurée ni déduite —
 * quelqu'un a dit où le projet se trouve, et c'est le genre de chose qu'on
 * rediscute six mois plus tard quand la parcelle change.
 */
export function localisationVersable(localisation = {}, zone = "") {
  const ligne = ligneDeLaLocalisation(localisation);
  if (!ligne) return null;

  return {
    sujet: SUJET_LOCALISATION,
    valeur: phraseDeLaLocalisation(ligne),
    tableau: [ligne],
    structure: STRUCTURE_DE_LA_LOCALISATION,
    quoi: "Où le projet se trouve : sa commune, son code INSEE, son code postal et son adresse.",
    utilisation: "L'entrée de la chaîne climatique. Les zonages neige et vent, puis la cote "
      + "hors gel, en découlent — et se refont quand elle change.",
    nature: NATURE.DONNEE_BASE,
    provenance: { type: PROVENANCE.DECISION, quoi: `saisie dans l'Atelier — ${ATELIER}` },
    statut: STATUT.RETENU,
    reference: "climat:localisation",
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * L'altitude du site, prête à être proposée.
 *
 * Elle se versait jusqu'ici comme un produit des zonages — « zonages
 * réglementaires — Marseille » —, ce qui était faux : le serveur ne la calcule
 * pas, il la reçoit et la rend telle quelle. C'est une **entrée**, et l'écrire
 * comme une sortie faisait de la chaîne climatique une boucle sur elle-même.
 */
export function altitudeVersable(localisation = {}, zone = "") {
  const valeur = mesure(localisation?.altitude, 2, "m");
  if (!valeur) return null;

  return {
    sujet: SUJET_ALTITUDE,
    valeur,
    quoi: "L'altitude du terrain naturel au droit du projet.",
    utilisation: "Elle décide de la réserve au-delà de 900 m sur les zonages, et elle est le "
      + "second terme de la formule de la cote hors gel.",
    nature: NATURE.DONNEE_BASE,
    provenance: { type: PROVENANCE.DECISION, quoi: `saisie dans l'Atelier — ${ATELIER}` },
    statut: STATUT.RETENU,
    reference: "climat:altitude",
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * Ce qu'un agent a lu du projet, avec la valeur lue.
 *
 * À la date de l'appel, et non par renvoi au catalogue : le jour où une V2 lira
 * autre chose, cette ligne-ci doit continuer de dire ce que la V1 a lu.
 */
function lecturesDeLAgent(agent, { localisation = null, altitude = "" } = {}) {
  const valeurs = {
    [SUJET_LOCALISATION]: phraseDeLaLocalisation(localisation),
    [SUJET_ALTITUDE]: altitude
  };

  return (Array.isArray(agent?.lit) ? agent.lit : [])
    .map((lue) => ({ sujet: texte(lue?.sujet), valeur: texte(valeurs[texte(lue?.sujet)]) }))
    .filter((lue) => lue.sujet);
}

/**
 * L'appel d'un agent, versé comme la fonction qu'il est.
 *
 * `referentiel: true` le range dans un `.ref` : c'est du raisonnement, pas un
 * fait du projet. Et `agent.genre = agent-D` dit que l'appel est déterministe —
 * mêmes entrées, même sortie —, donc qu'il se rejoue pour vérifier. Un agent-IA
 * ne se rejouerait pas pour ça : sa sortie peut varier à entrées égales, et le
 * rejeu ferait passer une variation du modèle pour un changement du projet.
 */
export function appelVersable(agent, { localisation = null, altitude = "", zone = "", resultats = {} } = {}) {
  const sorties = sortiesDeLAgent(agent);
  // Un appel qui n'a rien rendu ne se verse pas : la ligne dirait qu'un
  // raisonnement a eu lieu là où le serveur n'a pas répondu.
  const posees = sorties.filter((sortie) => texte(valeurDeLaSortie(sortie, resultats)));
  if (!posees.length) return null;

  return {
    sujet: agent.libelle,
    valeur: posees.map((sortie) => sortie.sujet).join(" · "),
    referentiel: true,
    agent: {
      genre: AGENT.D,
      utilitaire: agent.nom,
      version: agent.version,
      lit: (Array.isArray(agent.lit) ? agent.lit : []).map((lue) => texte(lue?.sujet)).filter(Boolean),
      ecrit: posees.map((sortie) => ({ sujet: sortie.sujet }))
    },
    quoi: agent.quoi,
    utilitaire: referenceOf(agent),
    lectures: lecturesDeLAgent(agent, { localisation, altitude }),
    nature: null,
    domaine: agent.domaine,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${agent.libelle} — ${referenceOf(agent)}` },
    source: agent.source,
    reference: `agent:${referenceOf(agent)}`,
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * La valeur d'une sortie, lue dans ce que le serveur a rendu.
 *
 * `resultats` est ce que l'écran a reçu, par clé d'outil. **Les deux clés sont
 * déclarées** : celle de l'outil dit dans quel résultat lire, celle du fait —
 * `snow_zone`, `frost_depth_m`, `h0_selected_m` — dit quoi y lire. Les deviner
 * du nom du sujet serait une machine à se tromper en silence.
 */
export function valeurDeLaSortie(sortie, resultats = {}) {
  const brut = resultats?.[sortie.outil];
  const charge = brut?.result_payload ?? brut ?? {};
  const valeur = charge?.[sortie.cle];
  if (valeur === null || valeur === undefined || texte(valeur) === "") return "";
  return sortie.decimales === null ? texte(valeur) : mesure(valeur, sortie.decimales, sortie.unite);
}

/**
 * Ce qu'un agent a posé, prêt à être proposé.
 *
 * Chaque ligne cite **son** utilitaire — celui qui la déduit, avec sa version —
 * et non l'agent : c'est ce qui permet de monter la version d'un seul zonage, et
 * c'est ce que le rejeu suit pour refaire cette valeur-là.
 *
 * Une sortie qu'aucun utilitaire ne déduit — le H0 de la table — cite l'agent,
 * faute de mieux, et dit d'où elle vient dans sa provenance.
 */
export function sortiesVersables(agent, { resultats = {}, localisation = null, altitude = "", zone = "" } = {}) {
  const commune = phraseDeLaLocalisation(localisation);

  return sortiesDeLAgent(agent).map((sortie) => {
    const valeur = valeurDeLaSortie(sortie, resultats);
    if (!valeur) return null;

    const outil = sortie.utilitaire;
    const lectures = (Array.isArray(outil?.lit) ? outil.lit : [])
      .map((lue) => ({
        sujet: texte(lue?.sujet),
        valeur: texte(lue?.sujet) === SUJET_ALTITUDE ? texte(altitude) : ""
      }))
      .filter((lue) => lue.sujet);

    return {
      sujet: sortie.sujet,
      valeur,
      // Une zone de neige est **tranchée par un tiers** : un texte la fixe, et le
      // fait qu'elle se déduise de la commune n'en fait pas une supposition — la
      // déduction fait partie de sa définition.
      nature: NATURE.CONTRAINTE,
      domaine: outil?.domaine ?? agent.domaine,
      quoi: sortie.quoi || "",
      source: texte(outil?.source) || agent.source,
      // Elle renvoie à l'appel qui l'a posée, et l'appel dit ce qu'il a lu :
      // c'est par là qu'on remonte jusqu'à la commune.
      provenance: {
        type: PROVENANCE.CALCUL,
        quoi: `${agent.libelle}${commune ? ` — ${commune}` : ""}`
      },
      statut: STATUT.RETENU,
      utilitaire: outil ? referenceOf(outil) : referenceOf(agent),
      lectures,
      reference: `climat:${sortie.cle}`,
      zones: texte(zone) ? [texte(zone)] : [],
      atelier: ATELIER
    };
  }).filter(Boolean);
}

/**
 * Toutes les lignes d'une étude climatique, dans l'ordre où on les lit.
 *
 * L'entrée d'abord, l'appel ensuite, ce qu'il a posé enfin. C'est l'ordre de la
 * chaîne, et c'est celui qu'on veut retrouver dans la proposition : un lecteur
 * qui signe doit voir d'où l'on part avant de voir ce qu'on en conclut.
 */
export function lignesVersables({ localisation = {}, resultats = {}, zone = "" } = {}) {
  const ligne = ligneDeLaLocalisation(localisation);
  const altitude = mesure(localisation?.altitude, 2, "m");

  const lignes = [
    localisationVersable(localisation, zone),
    altitudeVersable(localisation, zone)
  ];

  for (const agent of AGENTS_CLIMATIQUES) {
    lignes.push(appelVersable(agent, { localisation: ligne, altitude, zone, resultats }));
    lignes.push(...sortiesVersables(agent, { resultats, localisation: ligne, altitude, zone }));
  }

  return lignes.filter(Boolean);
}
