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
import { SENS, COMPARAISON } from "../services/tableau-structure.js";
import { PRODUIT, LOI } from "./vocabulaire.js";

/** Le sujet du projet qui commande l'assise. Il est nommé une fois, ici. */
export const SUJET_HORS_GEL = "Profondeur hors gel";

/**
 * Le tableau des massifs à dimensionner, tel que le projet le porte.
 *
 * ## Pourquoi il entre dans la mémoire
 *
 * C'est ce qui rend la reprise possible. Tant que les massifs vivaient dans
 * l'étude privée de l'Atelier, changer l'altitude du projet ne pouvait que
 * **marquer** les fondations à refaire : rien de ce qu'il fallait pour les
 * refaire n'était accessible. Le calcul est au serveur, ses entrées sont au
 * projet, et c'est ainsi qu'un appel se rejoue.
 *
 * Il entre donc comme n'importe quelle donnée de base — par une proposition que
 * quelqu'un signe —, et il devient visible de l'équipe. C'est le prix, et c'est
 * le bon : une cote que personne ne peut relire n'est pas une cote du projet.
 */
export const SUJET_DONNEES = "Données d'entrée des fondations superficielles";

/** Ce que l'appel rend, et range. Un seul nom, pour un tableau entier. */
export const SUJET_RESULTAT = "Résultat du calcul des fondations superficielles";

/**
 * La forme d'une ligne du tableau d'entrée.
 *
 * ## Pourquoi la déclarer
 *
 * « type: tableau » ne dit rien. Une fonction qui attend « les données d'entrée
 * des fondations superficielles » ne s'appelle pas tant qu'on ignore ce qu'il
 * faut mettre dans une ligne — et personne n'ira lire le code du serveur pour
 * le savoir.
 *
 * Elle dit la **forme**, jamais la loi : savoir qu'un massif porte un angle de
 * frottement n'apprend rien de la façon dont la portance s'en déduit.
 */
export const STRUCTURE_DES_ENTREES = [
  { nom: "désignation", type: "texte" },
  { nom: "nombre de massifs", type: "nombre" },
  { nom: "hypothèses réglementaires", champs: [
    { nom: "règlement", cle: "entrees.reglement",
      valeurs: ["Fascicule 62", "DTU 13.12", "EC - NF P94-261", "EC8-5 Annexe F"] },
    { nom: "répartition des contraintes", cle: "entrees.repartition",
      valeurs: ["Meyerhoff", "Constante"] },
    { nom: "drainage", cle: "entrees.drainage",
      valeurs: ["Sol drainé", "Sol non drainé"] },
    { nom: "unités", cle: "entrees.unites",
      valeurs: ["{ T ; Tm }", "{ kN ; kNm }", "{ daN ; daNm }"] }
  ] },
  { nom: "géométrie", champs: [
    { nom: "arase supérieure", cle: "entrees.araseSuperieure", type: "nombre, en m",
      quoi: "La cote du dessus du massif. C'est elle que la profondeur hors gel commande." },
    { nom: "hauteur Lz", cle: "entrees.hauteurLz", type: "nombre, en m",
      quoi: "L'épaisseur du massif, du dessus à l'assise." },
    { nom: "section Lx", cle: "entrees.sectionLx", type: "nombre, en m" },
    { nom: "section Ly", cle: "entrees.sectionLy", type: "nombre, en m" },
    // Trois clés pour un seul nom : « fût » recouvre une hauteur et deux côtés,
    // « excentrements » quatre décalages. Les faire varier demande de les nommer
    // un par un, et ce n'est pas à un écran de choisir ces noms-là.
    { nom: "fût", type: "hauteur, a et b, en m" },
    { nom: "excentrements", type: "charge/fût et fût/semelle, en m" }
  ] },
  { nom: "sol et matériaux", champs: [
    { nom: "poids volumique du sol", cle: "entrees.poidsVolumiqueSol", type: "nombre" },
    { nom: "contrainte limite à l'ELS", cle: "entrees.contrainteLimite", type: "nombre",
      quoi: "La contrainte que le sol admet à l'état-limite de service. C'est elle "
        + "qu'un rapport géotechnique donne, et celle qu'on fait varier pour voir "
        + "ce qu'un sol meilleur ou moins bon changerait au projet." },
    { nom: "angle de frottement", cle: "entrees.angleFrottement", type: "nombre, en degrés" },
    { nom: "cohésion non drainée", cle: "entrees.cohesionNonDrainee", type: "nombre" },
    { nom: "poids volumique du béton", type: "semelle et fût" }
  ] },
  { nom: "butée mobilisée", type: "part, angle, poids volumique, cotes haute et basse" },
  { nom: "béton armé", type: "enrobages, résistance du béton, limite d'élasticité de l'acier" },
  { nom: "charges", type: "par cas de charge : V, Hx, Hy, Mx, My" },
  { nom: "ferraillage", type: "par nappe : nombre de barres, diamètre" }
];

/**
 * La forme d'une ligne du tableau de résultat.
 *
 * Ce que l'appel rend, et donc ce qu'on peut lire de lui sans rouvrir l'Atelier.
 * Le détail du calcul — les trois cent quatre-vingt-huit combinaisons, les
 * ratios intermédiaires — n'en fait pas partie : il se relit dans l'étude, et il
 * ne décide de rien.
 */
export const STRUCTURE_DU_RESULTAT = [
  { nom: "désignation", type: "texte" },
  { nom: "nombre de massifs", type: "nombre" },
  { nom: "section Lx", type: "nombre, en m" },
  { nom: "section Ly", type: "nombre, en m" },
  { nom: "hauteur", type: "nombre, en m" },
  { nom: "arase supérieure", type: "nombre, en m" },
  { nom: "volume de béton", type: "nombre, en m3" },
  // **Le sens, et pas seulement le mot.** « en défaut » ne veut rien dire à un
  // écran : il faut le lui apprendre, ou le laisser neutre. Le lui apprendre par
  // un dictionnaire de mots français serait une machine à deviner, qui se
  // tromperait un jour sans le dire ; c'est donc l'utilitaire qui déclare, une
  // fois, et n'importe quel écran s'en sert. Voir `services/tableau-structure.js`.
  { nom: "vérification", valeurs: [
    { nom: "vérifiée", sens: SENS.TENU },
    { nom: "en défaut", sens: SENS.ROMPU },
    { nom: "non calculée", sens: SENS.INCONNU }
  ] },
  // Sans limite déclarée, « 16,050 » est un nombre sans échelle : on ne sait pas
  // si c'est seize fois trop ou seize fois la marge restante. Le ratio est un
  // taux de travail — il doit rester **au plus** à 1.
  { nom: "ratio déterminant", type: "nombre", marge: { limite: 1, comparaison: COMPARAISON.AU_PLUS } }
];

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
    { sujet: SUJET_HORS_GEL, entree: "profondeurHorsGel", nombre: true, unite: "m" },
    {
      sujet: SUJET_DONNEES,
      entree: "semelles",
      tableau: true,
      quoi: "L'ensemble des données d'entrée nécessaires au calcul de plusieurs massifs "
        + "de fondations superficielles : un massif par ligne, avec sa géométrie, son sol, "
        + "ses charges et les hypothèses réglementaires retenues.",
      utilisation: "Entrée du prédimensionnement des massifs superficiels. C'est ce que le "
        + "projet conserve pour pouvoir refaire le calcul le jour où l'une de ses données "
        + "de base change — l'altitude, donc la profondeur hors gel, par exemple.",
      structure: STRUCTURE_DES_ENTREES
    }
  ],

  /**
   * Ce que l'appel rend, et range.
   *
   * **Un seul nom pour un tableau entier**, et c'est la correction la plus
   * importante de cette version. La première dépliait les sorties : sept sujets
   * par massif, quatre-vingts lignes de cotes dans le fichier de **code**. On
   * n'y lisait plus ni ce que la fonction consommait ni comment l'appeler, et
   * le `.ref` portait les données du projet — ce qu'un `.ctr` existe pour
   * porter.
   */
  rend: {
    sujet: SUJET_RESULTAT,
    quoi: "Le tableau de synthèse du prédimensionnement : un massif par ligne, ses cotes, "
      + "son volume de béton et son verdict, plus le volume total de l'ensemble.",
    utilisation: "Ce que le projet retient des fondations superficielles : les cotes qui "
      + "partent aux plans et au quantitatif, et le volume de béton à commander.",
    structure: STRUCTURE_DU_RESULTAT
  },

  /**
   * Comment se rejouer : le même calcul au serveur, sur les mêmes massifs.
   *
   * Pas de formule recopiée — il n'y en a pas à recopier, c'est tout le propos.
   * Le rejeu redemande, et c'est aussi ce qui garantit qu'une reprise six mois
   * plus tard emploie la loi d'aujourd'hui plutôt qu'une copie de celle d'hier.
   */
  rejeu: { outil: "fondations" }
};
