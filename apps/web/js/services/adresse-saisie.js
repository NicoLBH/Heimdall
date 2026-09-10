/**
 * Une adresse qu'on tape, et ce qu'elle devient.
 *
 * ## Pourquoi ce fichier existe
 *
 * Trois écrans demandaient une adresse, et chacun la demandait à sa façon.
 *
 * - **Paramètres > Localisation** avait une auto-complétion d'adresse complète,
 *   écrite à la main dans un fichier de 1 700 lignes, avec deux branches mortes
 *   — commune et code postal — qu'aucun champ n'appelait plus.
 * - **Atelier > ENR-PV hangar neuf** en avait une seconde, recopiée, qui ne
 *   cherche pas des adresses mais des **communes** : elle ne rend ni rue, ni
 *   numéro, ni coordonnées de parcelle.
 * - **Atelier > Neige, vent & gel** n'en avait aucune : il offrait quatre champs
 *   nus — commune, code INSEE, code postal, altitude — qu'il fallait remplir de
 *   mémoire, dont un que personne ne connaît par cœur.
 *
 * Trois saisies pour une même question, c'est la règle 4 : *une valeur écrite à
 * deux endroits finit par diverger.* Elles avaient déjà divergé — l'une rendait
 * un code INSEE, l'autre non, la troisième l'exigeait sans savoir l'obtenir.
 *
 * Ce fichier tient la part qui ne parle à personne : ce qu'on garde d'une
 * réponse du service d'adresses, comment on l'écrit, et ce qui manque pour
 * calculer. Le champ lui-même — l'input, la liste, les flèches — vit dans
 * `views/ui/saisie-adresse.js`, et le réseau dans `services/georisques-service.js`.
 *
 * ## Le code INSEE n'est pas un détail d'affichage
 *
 * Deux communes françaises portent le même nom ; aucune ne partage son code
 * INSEE, et les tables de zonage se lisent par lui. Une adresse résolue le
 * porte. C'est ce qui permet à l'écran climatique de calculer **dès qu'une
 * adresse est choisie**, sans bouton et sans quatre champs à remplir.
 */

import { SUJET_LOCALISATION } from "../utilitaires/agents-climatiques.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un nombre, ou `null` — et **`null` n'est pas zéro**.
 *
 * `Number(null)` vaut `0`, comme `Number("")`. Une coordonnée absente valait donc
 * zéro, qui est un point au large du golfe de Guinée : l'écran demandait une
 * carte satellite de l'Atlantique au lieu de montrer qu'il n'avait pas de
 * localisation. Une altitude absente valait zéro mètre, ce qui se calcule très
 * bien jusqu'à une cote hors gel fausse. Ce qu'on ne sait pas reste vide
 * (`docs/fondamentaux.md`, règle 5).
 */
export function nombreOuRien(valeur) {
  if (valeur === null || valeur === undefined || String(valeur).trim() === "") return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

const nombre = nombreOuRien;

/**
 * En deçà, on ne cherche pas.
 *
 * Le service d'adresses rend n'importe quoi sur deux lettres, et la liste
 * clignoterait à chaque frappe du début d'un nom de rue.
 */
export const LONGUEUR_MINIMALE = 3;

/** Le temps qu'on laisse à la frappe avant d'interroger le service. */
export const DELAI_DE_FRAPPE = 180;

/**
 * Les propositions qu'on garde d'une réponse.
 *
 * Sans libellé, une proposition n'est pas cliquable — elle afficherait une ligne
 * vide qu'on choisirait sans savoir quoi. Et le service rend parfois deux fois
 * la même adresse sous deux graphies : deux lignes identiques à l'écran font
 * hésiter, et l'hésitation est du temps perdu sur un geste qui doit être bref.
 */
export function propositionsDAdresse(items = [], { limite = 6 } = {}) {
  const vues = new Set();
  const gardees = [];

  for (const item of Array.isArray(items) ? items : []) {
    const libelle = texte(item?.label || item?.name || item?.fulltext);
    if (!libelle) continue;

    const cle = libelle.toLocaleLowerCase("fr-FR");
    if (vues.has(cle)) continue;
    vues.add(cle);

    gardees.push({ libelle, item });
    if (gardees.length >= Math.max(1, limite)) break;
  }

  return gardees;
}

/**
 * Ce qu'on retient d'une adresse résolue.
 *
 * Le service rend `lat` et `lon` ; le projet et les ateliers écrivent `latitude`
 * et `longitude`. Deux noms pour une même coordonnée, et l'écran qui lisait
 * `resolved.latitude` recevait `undefined` sans un mot — la carte restait floue
 * et personne ne savait pourquoi. La traduction se fait donc **ici**, une fois.
 */
export function localisationDeLAdresse(resolue = null) {
  if (!resolue || typeof resolue !== "object") return null;

  return {
    address: texte(resolue.address ?? resolue.adresse ?? resolue.label),
    city: texte(resolue.city ?? resolue.commune),
    postalCode: texte(resolue.postalCode ?? resolue.codePostal),
    codeInsee: texte(resolue.codeInsee ?? resolue.code_insee),
    latitude: nombre(resolue.latitude ?? resolue.lat),
    longitude: nombre(resolue.longitude ?? resolue.lon)
  };
}

/**
 * L'adresse en une ligne, telle qu'on la relit dans le champ.
 *
 * Ce qui manque manque : une localisation sans rue s'écrit avec sa commune, et
 * ne se voit pas offrir une rue plausible (règle 5).
 */
export function adresseEnUneLigne(localisation = null) {
  if (!localisation) return "";
  const adresse = texte(localisation.address);
  if (adresse) return adresse;
  return [texte(localisation.postalCode), texte(localisation.city)].filter(Boolean).join(" ");
}

/**
 * Vrai quand le serveur a de quoi répondre.
 *
 * Sans code INSEE, les tables de zonage ne se lisent pas : le calcul ne part
 * pas, et il vaut mieux le dire que rendre le zonage d'une homonyme.
 */
export function localisationCalculable(localisation = null) {
  return texte(localisation?.codeInsee).length > 0;
}

/**
 * La colonne de la localisation qu'une valeur du socle désigne, ou `""`.
 *
 * La localisation se verse comme **un tableau d'une seule ligne à quatre
 * colonnes** — c'est un endroit, pas quatre faits —, si bien que l'écran de
 * variante en offre quatre entrées : commune, code INSEE, code postal, adresse.
 * Les taper à la main, c'est se tromper de commune homonyme ou inventer un code
 * INSEE. Reconnaître qu'on est sur l'une d'elles permet d'offrir **la même
 * saisie d'adresse que partout ailleurs**, et de n'en substituer que la colonne
 * choisie.
 *
 * On reconnaît par le **sujet**, qui vit à un seul endroit
 * (`utilitaires/agents-climatiques.js`) : un libellé recopié ici aurait cessé de
 * correspondre au premier renommage.
 */
export function colonneDeLaLocalisation(valeur = null) {
  const sujet = texte(valeur?.assertion?.payload?.subject);
  if (sujet !== SUJET_LOCALISATION) return "";
  return texte(valeur?.champ?.cle);
}

/**
 * Ce qu'une colonne de la localisation vaut, dans une adresse choisie.
 *
 * Les clés du tableau versé ne sont pas celles du service d'adresses —
 * `commune` contre `city`, `codePostal` contre `postalCode`. La correspondance
 * se déclare ici plutôt que de se deviner : deviner lirait un jour un champ
 * absent et substituerait une chaîne vide, ce qui se calcule très bien jusqu'à
 * une zone de neige fausse.
 */
export function valeurDeLaColonne(localisation = null, cle = "") {
  if (!localisation) return "";

  switch (texte(cle)) {
    case "commune": return texte(localisation.city);
    case "codeInsee": return texte(localisation.codeInsee);
    case "codePostal": return texte(localisation.postalCode);
    case "adresse": return texte(localisation.address);
    default: return "";
  }
}
