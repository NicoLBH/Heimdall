/**
 * La localisation du projet, telle qu'elle se propose à la mémoire.
 *
 * ## Pourquoi elle a son fichier
 *
 * Deux écrans la posent : les **Paramètres**, où le projet dit où il est, et
 * l'**Atelier** climatique, qui la corrige pour un calcul. Un même sujet, deux
 * saisies — et si chacun construisait sa ligne, les deux finiraient par ne plus
 * décrire la même chose (règle 4). La ligne se construit donc ici, une fois, et
 * chacun dit seulement **d'où** vient la saisie.
 *
 * ## Elle ne verse rien
 *
 * Comme tout le reste : **rien n'entre jamais directement dans la mémoire du
 * projet** (`docs/fondamentaux.md`, règle 1). Ce fichier construit la ligne ;
 * une proposition la fait entrer, et quelqu'un la signe.
 *
 * C'était précisément le défaut : l'écran de localisation écrivait « Adresse du
 * projet » **directement** en mémoire, sans proposition et sans signature. On
 * perdait le qui-quand-pourquoi sur la donnée la plus structurante du projet, et
 * — pire — **rien ne se recalculait** : changer la commune change la neige, le
 * vent, le gel et la zone sismique, donc les fondations et le spectre.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import {
  SUJET_ALTITUDE,
  SUJET_LOCALISATION,
  STRUCTURE_DE_LA_LOCALISATION
} from "../utilitaires/agents-climatiques.js";
// La mémoire n'a qu'une façon d'écrire une mesure : virgule décimale, unité
// collée. Deux écritures d'une même cote ne se comparent plus (règle 4).
import { mesureEcrite } from "../utilitaires/lecture-fait.js";
// Et une seule façon d'écrire une coordonnée : six décimales, point décimal.
import { coordonneeEcrite, nombreOuRien } from "./adresse-saisie.js";

const texte = (valeur) => String(valeur ?? "").trim();

export { SUJET_ALTITUDE, SUJET_LOCALISATION, STRUCTURE_DE_LA_LOCALISATION };

/**
 * La localisation telle qu'elle se verse : **une ligne, six colonnes**.
 *
 * Un tableau d'une seule ligne, et non six sujets. Une commune, son code INSEE,
 * son code postal et le point où le projet se trouve ne se lisent pas
 * séparément — c'est **un** endroit —, et les éclater ferait six lignes de
 * mémoire qu'aucun écran ne sait replier.
 *
 * ## Une adresse, ou un point
 *
 * Un projet qui n'est pas construit n'a pas d'adresse : il est dans un champ, et
 * ce qui le situe est le couple de coordonnées qu'on est allé pointer sur une
 * vue satellite. Les deux formes vivent donc dans la **même** ligne — l'adresse
 * peut manquer, le point peut manquer —, et non dans deux sujets qui auraient
 * fini par se contredire.
 *
 * ## Ce qui la rend versable
 *
 * Le **code INSEE**, toujours : deux communes françaises portent le même nom,
 * aucune ne partage son code, et les tables de zonage se lisent par lui. Un
 * point pointé sur la carte en donne un — le service d'adresses le rend à
 * l'envers, depuis les coordonnées —, si bien qu'un projet sans adresse en a un
 * quand même. Sans lui, on retiendrait une localisation avec laquelle rien ne se
 * calcule.
 */
export function ligneDeLaLocalisation(localisation = {}) {
  const ligne = {
    commune: texte(localisation.city ?? localisation.commune),
    codeInsee: texte(localisation.codeInsee ?? localisation.code_insee),
    codePostal: texte(localisation.postalCode ?? localisation.codePostal ?? localisation.postal_code),
    adresse: texte(localisation.address ?? localisation.adresse),
    latitude: coordonneeEcrite(localisation.latitude ?? localisation.lat),
    longitude: coordonneeEcrite(localisation.longitude ?? localisation.lon)
  };
  return ligne.codeInsee ? ligne : null;
}

/**
 * Comment la localisation se dit en une phrase, sur sa ligne de mémoire.
 *
 * Le point s'écrit quand il n'y a pas d'adresse — c'est alors la seule chose qui
 * situe le projet, et une phrase qui ne dirait que « Commune (INSEE 00000) »
 * laisserait croire qu'on ne sait pas où il est dans la commune.
 */
export function phraseDeLaLocalisation(ligne = null) {
  if (!ligne) return "";

  const nom = ligne.commune || "commune inconnue";
  const administratif = ligne.codePostal
    ? `${nom} (${ligne.codePostal}, INSEE ${ligne.codeInsee})`
    : `${nom} (INSEE ${ligne.codeInsee})`;

  if (texte(ligne.adresse)) return administratif;

  const point = pointDit(ligne);
  return point ? `${administratif} — ${point}` : administratif;
}

/**
 * Le point, écrit pour être lu par un humain : quatre décimales, séparés d'une
 * virgule. Les six décimales versées se comparent ; celles-ci se lisent.
 */
export function pointDit(ligne = null) {
  const lat = nombreOuRien(ligne?.latitude);
  const lon = nombreOuRien(ligne?.longitude);
  return lat === null || lon === null ? "" : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * La localisation, prête à être proposée comme donnée de base.
 *
 * Sa provenance est une **décision** : personne ne l'a mesurée ni déduite —
 * quelqu'un a dit où le projet se trouve, et c'est le genre de chose qu'on
 * rediscute six mois plus tard quand la parcelle change.
 *
 * @param {object} localisation ce que l'écran porte
 * @param {{zone?: string, ou?: string}} options `ou` nomme l'écran qui l'a saisie
 */
export function localisationVersable(localisation = {}, { zone = "", ou = "" } = {}) {
  const ligne = ligneDeLaLocalisation(localisation);
  if (!ligne) return null;

  const atelier = texte(ou);

  return {
    sujet: SUJET_LOCALISATION,
    valeur: phraseDeLaLocalisation(ligne),
    tableau: [ligne],
    structure: STRUCTURE_DE_LA_LOCALISATION,
    quoi: "Où le projet se trouve : sa commune, son code INSEE, son code postal, son adresse "
      + "quand il en a une, et le point qu'on a retenu.",
    utilisation: "L'entrée de la chaîne climatique. Les zonages neige et vent, puis la cote "
      + "hors gel, en découlent — et se refont quand elle change.",
    nature: NATURE.DONNEE_BASE,
    provenance: { type: PROVENANCE.DECISION, quoi: atelier ? `saisie — ${atelier}` : "saisie" },
    statut: STATUT.RETENU,
    reference: "climat:localisation",
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: atelier || null
  };
}

/**
 * L'altitude du site, prête à être proposée.
 *
 * Elle se versait comme un produit des zonages — « zonages réglementaires —
 * Marseille » —, ce qui était faux : le serveur ne la calcule pas, il la reçoit
 * et la rend telle quelle. C'est une **entrée**, et l'écrire comme une sortie
 * faisait de la chaîne climatique une boucle sur elle-même.
 */
export function altitudeVersable(localisation = {}, { zone = "", ou = "" } = {}) {
  const valeur = mesureEcrite(localisation?.altitude, 2, "m");
  if (!valeur) return null;

  const atelier = texte(ou);

  return {
    sujet: SUJET_ALTITUDE,
    valeur,
    quoi: "L'altitude du terrain naturel au droit du projet.",
    utilisation: "Elle décide de la réserve au-delà de 900 m sur les zonages, et elle est le "
      + "second terme de la formule de la cote hors gel.",
    nature: NATURE.DONNEE_BASE,
    provenance: { type: PROVENANCE.DECISION, quoi: atelier ? `saisie — ${atelier}` : "saisie" },
    statut: STATUT.RETENU,
    reference: "climat:altitude",
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: atelier || null
  };
}
