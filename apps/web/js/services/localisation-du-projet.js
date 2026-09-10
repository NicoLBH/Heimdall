/**
 * Où le projet se trouve, **d'après la mémoire**.
 *
 * ## Pourquoi lire la mémoire, et non la fiche
 *
 * La fiche du projet — `store.projectForm` — porte une adresse. Elle sert à
 * dessiner une carte et à pré-remplir un champ, et elle est **en retard** : elle
 * a été chargée quand on est entré dans le projet, et une proposition fusionnée
 * depuis, par soi ou par un collègue, ne la met pas à jour.
 *
 * Le symptôme se voyait à l'Atelier climatique : on corrigeait la localisation
 * dans les Paramètres, on signait la proposition, on ouvrait « Neige, Vent &
 * Gel », et l'ancienne adresse était encore là. Le calcul, lui, serait parti sur
 * celle-là. C'est le genre de chose qui fait perdre confiance en un outil
 * beaucoup plus vite qu'une panne franche : rien ne dit que c'est faux.
 *
 * La mémoire, elle, est la seule qui dise où le projet est **aujourd'hui** :
 * c'est ce que quelqu'un a signé.
 *
 * ## Ce que ce fichier fait, et ce qu'il ne fait pas
 *
 * Il lit une liste d'affirmations et en tire une localisation. Il ne parle à
 * personne : c'est l'écran qui va chercher la mémoire, et qui décide de ce qu'il
 * fait d'un projet qui n'en a pas encore.
 */

import { SUJET_LOCALISATION, SUJET_ALTITUDE } from "../utilitaires/agents-climatiques.js";
import { nombreOuRien } from "./adresse-saisie.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** La dernière affirmation en vigueur sur ce sujet, ou `null`. */
function derniereSur(assertions, sujet) {
  const dites = (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => !texte(assertion?.superseded_by))
    .filter((assertion) => texte(assertion?.payload?.subject) === sujet);

  if (!dites.length) return null;

  // La plus récemment décidée : une mémoire peut porter deux versements du même
  // sujet le temps qu'un remplacement se propage, et prendre le premier venu
  // rendrait l'adresse d'avant une fois sur deux.
  return dites.reduce((tenue, autre) => (
    texte(autre?.decided_at) > texte(tenue?.decided_at) ? autre : tenue
  ));
}

/**
 * La localisation que le projet tient pour vraie, ou `null`.
 *
 * `null` a deux causes qu'il ne faut pas confondre à l'écran : le projet n'a pas
 * encore de localisation en mémoire, ou la mémoire n'a pas pu être lue.
 * L'appelant sait laquelle des deux — il sait s'il a reçu une liste — et c'est à
 * lui de le dire (règle 5).
 */
export function localisationDeLaMemoire(assertions = null) {
  const ligne = derniereSur(assertions, SUJET_LOCALISATION)?.payload?.tableau?.[0];
  if (!ligne) return null;

  const altitude = derniereSur(assertions, SUJET_ALTITUDE)?.payload?.value;

  return {
    address: texte(ligne.adresse),
    city: texte(ligne.commune),
    postalCode: texte(ligne.codePostal),
    codeInsee: texte(ligne.codeInsee),
    latitude: nombreOuRien(ligne.latitude),
    longitude: nombreOuRien(ligne.longitude),
    // « 97,91 m » se relit en nombre : c'est ainsi que la mémoire écrit ses
    // mesures, et le calcul climatique attend un nombre.
    altitude: nombreOuRien(texte(altitude).replace(",", ".").replace(/[^\d.\-]/g, ""))
  };
}
