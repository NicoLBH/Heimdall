/**
 * Le pré-dimensionnement des fondations superficielles, déclaré — jamais écrit.
 *
 * ## Ce fichier ne calcule rien, et c'est le sujet
 *
 * Les autres utilitaires du catalogue disent ce qu'ils lisent **et** comment ils
 * concluent : `deduire(fait)` reprend la valeur du serveur et la met en forme,
 * et le `.ref` versé porte les conditions de l'arrêté. C'est possible parce que
 * leur loi est publique — un décret, une table du DTU, un zonage. L'écrire est
 * ce qui rend la mémoire vérifiable.
 *
 * Celui-ci n'est pas de cette famille. Descente de charge, combinaisons
 * pondérées, portance, glissement, renversement, ferraillage : la loi **est** le
 * produit. L'écrire dans le fichier d'un projet reviendrait à la donner, et un
 * projet exporté la donnerait à qui l'ouvre.
 *
 * On ne peut pas non plus le taire. Une fois employé, il a décidé de cotes que
 * le client paiera en béton ; les cacher ferait de la moitié du raisonnement un
 * trou, et « ne pas savoir n'autorise pas à prétendre qu'il n'y a rien ».
 *
 * D'où sa forme : une **fonction native du langage** (voir
 * `docs/fondamentaux.md`, règle 9). Ce fichier déclare son nom, sa version, ce
 * qu'elle lit et ce qu'elle écrit. Le calcul, lui, vit dans
 * `supabase/functions/fondations-stabilite-externe`, et n'en descend pas.
 *
 * ## Pourquoi elle lit la profondeur hors gel
 *
 * C'est la seule entrée du projet qui **commande** une cote. Le NF DTU 13.1
 * impose que l'assise descende au moins à cette profondeur ; au-dessus, le sol
 * gèle sous la semelle et la soulève, et aucun des calculs de stabilité ne le
 * verrait. Elle était jusqu'ici lue pour **alerter** — l'écran disait « l'assise
 * est trop haute » et attendait qu'on corrige à la main. La déclarer comme
 * entrée est ce qui referme la chaîne : l'altitude du projet change, la
 * profondeur hors gel se recalcule, et les fondations avec elle.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT, LOI } from "./vocabulaire.js";

/** Le sujet du projet qui commande l'assise. Il est nommé une fois, ici. */
export const SUJET_HORS_GEL = "Profondeur hors gel";

export const DIMENSIONNEMENT_FONDATIONS_SUPERFICIELLES_V1 = {
  nom: "dimensionnement_fondations_superficielles",
  version: "V1",
  libelle: "Prédimensionnement des fondations superficielles",
  source: "NF P94-261, EN 1997-1, EN 1992-1-1",
  produit: PRODUIT.DIMENSIONNEMENT,
  // Ce qui change tout le reste : la loi ne descend pas.
  loi: LOI.SECRETE,
  domaine: DOMAIN.STRUCTURE,

  /**
   * Ce qu'elle explique d'elle-même, dans le fichier du projet.
   *
   * C'est le commentaire qui ouvrira la fonction. Il dit **ce qu'elle fait**, et
   * s'arrête là où commence le comment : une phrase de plus et l'on aurait
   * commencé à décrire la loi.
   */
  quoi: "Dimensionne les massifs superficiels d'une zone : descente de charge, "
    + "combinaisons, portance du sol, glissement, renversement et ferraillage. "
    + "La loi de calcul appartient à l'utilitaire — elle ne s'écrit pas ici.",

  /**
   * Ce qu'elle lit du projet.
   *
   * Une seule entrée pour l'instant, et elle est déclarée pour la même raison
   * que dans les autres utilitaires : `entree` dit **par quel champ de l'appel**
   * ce sujet entre dans le calcul, donc lequel on peut faire varier. Sans elle,
   * une variante d'altitude s'arrêterait à la profondeur hors gel et les
   * fondations resteraient celles d'avant, sans que rien ne le dise.
   *
   * Les entrées propres à chaque massif — charges, cotes, sol — ne sont pas ici :
   * ce ne sont pas des faits du projet mais la saisie de l'Atelier, et les
   * déclarer ferait attendre à la mémoire des sujets que personne ne verse.
   */
  lit: [
    { sujet: SUJET_HORS_GEL, entree: "profondeurHorsGel", nombre: true, unite: "m" }
  ],

  /**
   * Comment se rejouer : le même calcul au serveur, sur les mêmes massifs.
   *
   * Pas de formule recopiée — il n'y en a pas à recopier, c'est tout le propos.
   * Le rejeu redemande, et c'est aussi ce qui garantit qu'une reprise six mois
   * plus tard emploie la loi d'aujourd'hui plutôt qu'une copie de celle d'hier.
   */
  rejeu: { outil: "fondations" }
};
