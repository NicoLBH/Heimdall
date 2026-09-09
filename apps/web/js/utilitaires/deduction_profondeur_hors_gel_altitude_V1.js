/**
 * Profondeur hors gel, déduite du département et de l'altitude.
 *
 *   H = H0 + (altitude − 150) / 4000
 *
 * H0 vient d'une table départementale ; l'altitude vient du site. Le NF DTU 13.1
 * impose que les fondations descendent au moins à cette cote : c'est une
 * contrainte, et elle relève du **sol** — c'est lui qui commande une cote de
 * fondation, pas la structure.
 *
 * **Le choix de H0 est une décision, pas une déduction.** Quand le département
 * offre une fourchette, quelqu'un a retenu une valeur, et la réserve le dit. La
 * formule, elle, ne se discute pas.
 *
 * Le calcul a lieu dans `resolve-climate-tool`, seul à disposer de la table.
 * Cet utilitaire lit et traduit — et c'est la lecture qui porte la version.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVE, RESERVES } from "./reserves.js";
import { lecturesDeclarees, reservesConservees, entreesDe, mesureEcrite } from "./lecture-fait.js";

export const DEDUCTION_PROFONDEUR_HORS_GEL_ALTITUDE_V1 = {
  nom: "deduction_profondeur_hors_gel_altitude",
  version: "V1",
  libelle: "Profondeur hors gel d'après le département et l'altitude",
  source: "NF DTU 13.1",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Profondeur hors gel",
  domaine: DOMAIN.SOL,
  cleDonnee: "frost_depth",

  /**
   * Les deux termes de la formule, dans l'ordre où elle les écrit.
   *
   * `H = H0 + (altitude − 150) / 4000` : les deux sont des sujets que le projet
   * verse, et les deux sont donc déclarés. Le département et le canton, non —
   * ils servent à choisir H0 au serveur, mais la mémoire ne les porte pas, et
   * déclarer un sujet que rien ne verse ferait un lien vers rien.
   *
   * `entree` dit **par quel champ de l'appel** ce sujet entre dans le calcul.
   * L'altitude en a un : le serveur la reçoit et recalcule. H0 n'en a pas — le
   * serveur le choisit lui-même dans sa table départementale, et le lui imposer
   * reviendrait à lui faire dire autre chose que ce que le DTU dit. Un sujet sans
   * `entree` se lit donc sans se faire varier, et l'écran le dit plutôt que de
   * rendre un chiffre.
   */
  lit: [
    { sujet: "H0 retenu pour le département", lire: (fait) => fait?.fact_value?.h0_selected_m },
    {
      sujet: "Altitude du site",
      entree: "altitude",
      // L'appel attend un nombre. « 1200 m » n'en est pas un pour lui, et le
      // laisser passer le ferait retomber sur zéro — une cote de fondation
      // calculée au niveau de la mer, énoncée comme une règle.
      nombre: true,
      lire: (fait) => fait?.fact_value?.inputs?.altitude ?? fait?.fact_value?.altitude
    }
  ],

  /**
   * Comment se rejouer : le même outil serveur, en mode « calcule sans écrire ».
   *
   * Pas de formule recopiée ici. La table départementale vit au serveur, la loi
   * aussi, et une seconde copie dans le navigateur finirait par diverger de la
   * première — c'est arrivé ailleurs dans ce projet. On redemande, simplement.
   */
  rejeu: { outil: "frost" },

  deduire(fait = {}) {
    const brut = fait?.fact_value?.frost_depth_m;

    // `Number(null)` vaut zéro. Lire la profondeur sans écarter l'absence
    // d'abord ferait entrer « Profondeur hors gel : 0,00 m » — une cote de
    // fondation au niveau du sol, énoncée comme une règle.
    if (brut === null || brut === undefined || String(brut).trim() === "") return null;
    const metres = Number(brut);
    if (!Number.isFinite(metres)) return null;

    const entrees = entreesDe(fait);
    const reserves = reservesConservees(fait);

    // La formule a besoin de l'altitude. Sans elle, la cote a été calculée à
    // 150 m par défaut, ce qui n'est vrai nulle part en particulier.
    const altitude = Number(entrees?.altitude ?? fait?.fact_value?.altitude);
    if (entrees && !Number.isFinite(altitude)) reserves.add(RESERVE.ALTITUDE_ABSENTE);

    return {
      // La virgule décimale, comme partout ailleurs dans la mémoire : « 2.59 m »
      // ne se rapproche pas de « 2,59 m », et la même cote s'écrivait de deux
      // façons selon qui l'avait posée.
      valeur: mesureEcrite(metres, 2, "m"),
      entrees,
      lectures: lecturesDeclarees(DEDUCTION_PROFONDEUR_HORS_GEL_ALTITUDE_V1, fait),
      reserves: [...reserves].filter((code) => RESERVES.includes(code)).sort()
    };
  }
};
