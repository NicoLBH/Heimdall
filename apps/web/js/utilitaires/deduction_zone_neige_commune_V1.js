/**
 * Zone de neige, déduite de la commune.
 *
 * La zone vient d'une table département, corrigée par des surcharges de canton.
 * Ce n'est pas une estimation : **la déduction est la définition** de la zone.
 * Aucune mesure ne la tranche, un texte la fixe — c'est une contrainte.
 *
 * Cet utilitaire ne calcule pas : le calcul a lieu dans `resolve-climate-tool`,
 * qui seul a les tables en base. Il **lit** le fait produit et le traduit en
 * contrainte, en conservant les réserves que le calcul a nommées. Séparer les
 * deux est voulu : la table de zonage n'a pas la même vie que sa lecture, et
 * c'est la lecture qu'on versionne ici.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVE, RESERVES } from "./reserves.js";
import { lecturesDeclarees, reservesConservees, entreesDe } from "./lecture-fait.js";
import { SUJET_ALTITUDE } from "./agents-climatiques.js";

export const DEDUCTION_ZONE_NEIGE_COMMUNE_V1 = {
  nom: "deduction_zone_neige_commune",
  version: "V1",
  libelle: "Zone de neige d'après la commune",
  source: "Annexe Nationale NF EN 1991-1-3",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Zone de neige",
  domaine: DOMAIN.STRUCTURE,
  cleDonnee: "snow_zone",

  /**
   * L'altitude, et rien d'autre du projet.
   *
   * La commune est lue par l'**agent**, pas ici : c'est lui qui fait l'appel, et
   * c'est sa déclaration qui porte la localisation du projet — voir
   * `agents-climatiques.js`. Ce fichier-ci est la *lecture* du fait produit, et
   * ce qu'elle lit du projet est l'altitude : c'est elle qui décide de la réserve
   * au-delà de 900 m, et un projet qui la corrige doit voir cette zone bouger.
   */
  lit: [
    {
      sujet: SUJET_ALTITUDE,
      entree: "altitude",
      /** L'appel attend un nombre : « 1200 m » retomberait sur zéro. */
      nombre: true,
      lire: (fait) => fait?.fact_value?.inputs?.altitude
    }
  ],

  /** Le même outil serveur qu'au versement, en mode « calcule sans écrire ». */
  rejeu: { outil: "snow" },

  deduire(fait = {}) {
    const valeur = String(fait?.fact_value?.zone ?? "").trim();
    if (!valeur) return null;

    const entrees = entreesDe(fait);
    const reserves = reservesConservees(fait);

    // L'altitude ne rend pas la zone fausse : au-delà de 900 m elle ne suffit
    // plus, et l'Annexe Nationale demande une étude. Ce n'est pas le même défaut.
    const altitude = Number(entrees?.altitude);
    if (Number.isFinite(altitude) && altitude > 900) reserves.add(RESERVE.ALTITUDE_HORS_TABLE);

    return {
      valeur,
      entrees,
      lectures: lecturesDeclarees(DEDUCTION_ZONE_NEIGE_COMMUNE_V1, fait),
      reserves: [...reserves].filter((code) => RESERVES.includes(code)).sort()
    };
  }
};
