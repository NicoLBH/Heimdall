/**
 * L'agent-D des risques naturels, et les deux choses qu'il pose du site.
 *
 * ## Le défaut qu'on ferme
 *
 * L'écran « Risques Naturels & Technologiques » interrogeait Géorisques,
 * affichait quinze tableaux, et en conservait deux jeux comme données de base :
 * le zonage sismique et le retrait-gonflement des argiles. Deux valeurs
 * défendables — l'une parce que la commune *est* la maille de la règle, l'autre
 * parce qu'elle se lit au point du projet.
 *
 * Ces deux valeurs n'étaient **déclarées nulle part**. Conséquence : elles ne
 * lisaient rien, personne ne lisait qu'elles lisaient la localisation, et
 * déplacer un projet les laissait derrière. Le symptôme se voyait dans la
 * variante : « cet utilitaire ne sait pas se rejouer ». Ce n'était pas faux —
 * c'était incomplet. Rien ne disait *ce qu'il faudrait* pour le rejouer.
 *
 * C'est la moitié manquante d'une démonstration que le projet fait déjà pour le
 * climat : **je déplace le projet, la zone de sismicité change, le spectre
 * change, et tout ce qui se dimensionne dessus suit.** Le spectre était prêt —
 * il déclare lire la zone depuis le premier jour (`utilitaires/agent-spectre.js`)
 * —, la zone ne l'était pas. La chaîne s'arrêtait sur son premier maillon.
 *
 * ## Deux mailles, et c'est tout le sujet
 *
 * | ce qu'il pose | à quelle maille | pourquoi |
 * | --- | --- | --- |
 * | zone de sismicité | la **commune** | le zonage est communal par décret (2010-1255) : répondre « pour la commune » est la bonne réponse, pas une approximation |
 * | retrait-gonflement des argiles | le **point** | l'aléa change à l'intérieur d'une commune ; le demander à la commune serait rendre une valeur pour une autre parcelle |
 *
 * D'où deux lectures de la **même** ligne de localisation, par deux colonnes
 * différentes : le code INSEE d'un côté, le couple de coordonnées de l'autre.
 * C'est exactement ce que `champ` sert à dire, et c'est pourquoi un projet sans
 * point retrouve sa zone sismique mais pas son exposition aux argiles — ce qui
 * est la vérité, et non une panne (règle 5).
 *
 * ## Où l'interrogation vit
 *
 * Chez Géorisques, service public ouvert, interrogé par
 * `services/georisques-service.js`. Aucune table n'est recopiée ici : le zonage
 * change, et une copie serait fausse le jour où il change sans que rien ne le
 * dise. L'agent déclare **ce qu'il faut demander**, pas ce que la réponse vaut.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { LIT_LA_LOCALISATION, SUJET_LOCALISATION } from "./agents-climatiques.js";

/**
 * La zone du zonage sismique français, nommée **ici**.
 *
 * Elle vivait dans `agent-spectre.js`, qui la **lit**. Un nom vit là où la chose
 * est posée, et c'est cet agent-ci qui la pose : le spectre l'importe désormais
 * au lieu de la redire (règle 10).
 */
export const SUJET_ZONE_SISMIQUE = "Zone de sismicité";

/** L'exposition au retrait-gonflement des argiles, au point du projet. */
export const SUJET_ARGILES = "Retrait-gonflement des argiles";

/**
 * La localisation, lue **par son point** et non par sa commune.
 *
 * Le pendant de `LIT_LA_LOCALISATION` pour ce qui se demande en latitude /
 * longitude. Deux déclarations sur le même sujet, chacune nommant sa colonne :
 * une variante qui déplace le projet de cent mètres sans changer de commune
 * atteint celle-ci et pas l'autre — et c'est juste, car l'aléa argileux a
 * changé quand le zonage sismique, lui, n'a pas bougé.
 */
export const LIT_LE_POINT = [
  {
    sujet: SUJET_LOCALISATION,
    entree: "latitude",
    champ: "latitude",
    nombre: true,
    quoi: "La latitude du point retenu. L'aléa argileux se lit là, et non à l'échelle de "
      + "la commune : deux parcelles voisines peuvent ne pas avoir la même exposition."
  },
  {
    sujet: SUJET_LOCALISATION,
    entree: "longitude",
    champ: "longitude",
    nombre: true,
    quoi: "La longitude du point retenu, avec la latitude."
  }
];

/**
 * L'agent-D des risques naturels du site.
 *
 * Un seul appel — la même interrogation Géorisques rend les deux jeux —, deux
 * sorties. Les séparer ferait deux allers-retours pour une seule consultation,
 * et deux lignes de raisonnement là où l'on en a fait une.
 */
export const AGENT_D_RISQUES_NATURELS_V1 = {
  nom: "agent_d_risques_naturels",
  version: "V1",
  libelle: "Risques naturels du site d'après Géorisques",
  source: "Géorisques",
  domaine: DOMAIN.STRUCTURE,
  quoi: "Interroge Géorisques sur la commune et sur le point du projet, et en retient les "
    + "deux aléas dont la maille correspond à ce qu'on affirme : le zonage sismique, "
    + "communal par décret, et le retrait-gonflement des argiles, ponctuel.",

  /** Les clés que le rejeu connaît. Voir `rend` pour ce que chacune produit. */
  outils: ["seismic", "argiles"],

  /**
   * Ce qu'il pose.
   *
   * `cle` est le champ du **fait de contexte** que l'interrogation conserve, et
   * il se déclare : `seismic_zone` d'un côté, `argiles` de l'autre. Le deviner
   * depuis le nom de l'outil lirait un jour un champ absent et rendrait une
   * valeur vide sans un mot.
   */
  rend: [
    { outil: "seismic", cle: "seismic_zone" },
    { outil: "argiles", cle: "argiles" }
  ],

  /**
   * Ce qu'il lit du projet : une seule ligne, par trois de ses colonnes.
   *
   * Le code INSEE pour le zonage sismique, le point pour les argiles. C'est la
   * même localisation ; ce sont deux façons de la lire, et la variante les
   * distingue.
   */
  lit: [LIT_LA_LOCALISATION, ...LIT_LE_POINT]
};

/** L'agent, seul de sa famille pour l'instant. */
export const AGENTS_RISQUES_NATURELS = [AGENT_D_RISQUES_NATURELS_V1];
