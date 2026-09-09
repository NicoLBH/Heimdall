/**
 * Le vocabulaire commun des utilitaires.
 *
 * Séparé du catalogue à dessein : le catalogue importe les utilitaires, et les
 * utilitaires ont besoin de ce vocabulaire. S'il vivait dans le catalogue, la
 * boucle d'imports laisserait `PRODUIT` non initialisé au moment où le premier
 * utilitaire s'évalue — une panne qui ne se voit qu'au chargement, et qui ne dit
 * pas son nom.
 */

/** Ce qu'un utilitaire produit. Trois familles, et elles ne se mélangent pas. */
export const PRODUIT = {
  /** Une règle du site, déduite de données de base. */
  CONTRAINTE: "contrainte",
  /** Un constat, extrait d'un document. */
  CONSTAT: "constat",
  /**
   * Un **dimensionnement** : des cotes, et le verdict qui va avec.
   *
   * Ce n'est ni une règle du site ni une lecture de document : c'est un calcul
   * qui décide, et qui en décide plusieurs à la fois — un tableau de semelles,
   * pas une valeur. Le distinguer n'est pas une taxinomie de plus : une
   * contrainte se déduit d'une donnée de base et se relit, un dimensionnement se
   * **refait**, et l'écran ne propose pas les mêmes gestes devant l'un et devant
   * l'autre.
   */
  DIMENSIONNEMENT: "dimensionnement"
};

/**
 * La loi d'un utilitaire est-elle publique ?
 *
 * Un zonage sismique vient d'un décret : sa loi s'écrit, se rejoue, se conteste,
 * et l'écrire est ce qui donne sa valeur à la mémoire. Un pré-dimensionnement de
 * fondations, non : sa loi **est** le produit, et l'écrire dans le fichier d'un
 * projet reviendrait à la donner.
 *
 * On ne peut pas pour autant le cacher. Une fois employé, il a décidé de cotes ;
 * les taire ferait de la moitié du raisonnement un trou, et « ne pas savoir
 * n'autorise pas à prétendre qu'il n'y a rien ».
 *
 * D'où ce marqueur, et la forme qu'il commande : la **fonction native**. Ses
 * entrées, ses sorties, sa version et sa place dans le graphe s'écrivent comme
 * pour n'importe quelle fonction ; son corps tient en une ligne qui dit qu'il ne
 * se lit pas. Voir `docs/fondamentaux.md`, règle 9.
 */
export const LOI = {
  /** Elle s'écrit dans le `.ref`, et se rejoue depuis le texte. */
  PUBLIQUE: "publique",
  /** Elle reste au serveur. Le `.ref` porte l'appel, jamais le calcul. */
  SECRETE: "secrete"
};
