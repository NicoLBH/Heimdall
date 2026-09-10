/**
 * Zone de vent, déduite de la commune.
 *
 * Même mécanique que la neige, même raison d'être une contrainte : un texte la
 * fixe, aucune mesure ne la tranche. Elle a son fichier parce qu'elle a sa vie —
 * le zonage vent et le zonage neige ne sont pas révisés ensemble, et les faire
 * partager un fichier ferait monter deux versions pour une seule correction.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVES } from "./reserves.js";
import { lecturesDeclarees, reservesConservees, entreesDe } from "./lecture-fait.js";
import { SUJET_LOCALISATION } from "./agents-climatiques.js";

export const DEDUCTION_ZONE_VENT_COMMUNE_V1 = {
  nom: "deduction_zone_vent_commune",
  version: "V1",
  libelle: "Zone de vent d'après la commune",
  source: "Annexe Nationale NF EN 1991-1-4",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Zone de vent",
  domaine: DOMAIN.STRUCTURE,
  cleDonnee: "wind_zone",

  /**
   * Ce qu'elle lit du projet : la commune, et elle seule.
   *
   * Elle ne déclarait **rien**, et le commentaire disait pourquoi : « le jour où
   * le projet posera sa commune comme une donnée de base, il n'y aura qu'une
   * ligne à ajouter ». Ce jour est venu — la localisation est un sujet de la
   * mémoire —, et voici la ligne. Sans elle, changer la commune laissait la zone
   * de vent derrière, sans un mot.
   *
   * L'altitude, non : elle ne décide de rien dans le zonage du vent.
   */
  lit: [
    {
      sujet: SUJET_LOCALISATION,
      entree: "code_insee",
      lire: (fait) => fait?.fact_value?.inputs?.code_insee ?? fait?.fact_value?.codeInsee
    }
  ],

  /** Le même outil serveur, en mode « calcule sans écrire ». */
  rejeu: { outil: "wind" },

  deduire(fait = {}) {
    const valeur = String(fait?.fact_value?.zone ?? "").trim();
    if (!valeur) return null;

    return {
      valeur,
      entrees: entreesDe(fait),
      lectures: lecturesDeclarees(DEDUCTION_ZONE_VENT_COMMUNE_V1, fait),
      reserves: [...reservesConservees(fait)].filter((code) => RESERVES.includes(code)).sort()
    };
  }
};
