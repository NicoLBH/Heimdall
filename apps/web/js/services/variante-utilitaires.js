/**
 * Les deux relectures d'utilitaires que nous savons faire — et rien de plus.
 *
 * ## Pourquoi ce fichier est une exception, et se dit comme telle
 *
 * Le moteur rejoue les **règles** du projet : il lit leur instantané, évalue
 * leurs conditions, rend leur conclusion. Il généralise.
 *
 * Un **utilitaire**, non. Il calcule au serveur, sur des faits de contexte, et
 * la contrainte qu'il produit ne cite pas la donnée de base dont elle vient :
 * elle garde un nombre. Il n'y a donc rien à rejouer — sauf pour deux d'entre
 * eux, dont la loi tient en une ligne et dont on connaît l'entrée.
 *
 * Ce fichier porte ces deux-là. Il ne s'allongera pas d'un cas par projet : ce
 * serait réécrire le serveur dans le navigateur, un utilitaire à la fois. Il
 * **disparaîtra** le jour où les utilitaires nommeront leurs sources — voir
 * `docs/a-traiter-plus-tard.md`, § 1.
 *
 * ## Pourquoi la table départementale ne descend pas au navigateur
 *
 * La profondeur hors gel vaut `H = H0 + (altitude − 150) / 4000`, et `H0` vient
 * d'une table départementale qui vit au serveur. On n'a pas besoin d'elle :
 * `H0` étant le même pour les deux lectures, il se simplifie, et il reste
 *
 *   H' = H + (altitude' − altitude) / 4000
 *
 * La contrainte en mémoire garde l'altitude sur laquelle elle a été calculée
 * (`payload.inputs.altitude`), et c'est tout ce qu'il faut.
 */

import { NATURE, classifyAssertion } from "./assertion-taxonomy.js";
import { DERIVED_CONSTRAINT_KIND } from "./derived-constraints.js";
import { RESERVE, RESERVES } from "../utilitaires/reserves.js";
import { lireUnNombre } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le sujet que ces relectures savent faire varier. Un seul, et il se nomme. */
export const SUJET_ALTITUDE = "Altitude du site";

/**
 * Ce que l'écran reconnaît comme « l'altitude du site ».
 *
 * On accepte plusieurs écritures parce que la donnée a été posée à la main dans
 * les projets existants — « Altitude », « altitude du terrain ». On ne devine
 * rien au-delà : un sujet qui ne contient pas le mot n'est pas une altitude.
 */
export function estLAltitude(assertion) {
  if (classifyAssertion(assertion).nature !== NATURE.DONNEE_BASE) return false;
  const sujet = texte(assertion?.payload?.subject) || texte(assertion?.statement);
  return /altitude/i.test(sujet);
}

/**
 * Les lignées d'utilitaires qui **lisent l'altitude**, quelle que soit la version.
 *
 * Distincte de `RELECTURES`, et la distinction est le cœur du problème. Savoir
 * qu'une déduction lit l'altitude et savoir la rejouer sont deux choses : la
 * première dit qu'elle est **concernée**, la seconde qu'on peut lui rendre un
 * chiffre. Une contrainte concernée qu'on ne sait pas rejouer doit être nommée —
 * ne pas savoir n'autorise pas à prétendre qu'il n'y a rien (règle 5).
 */
const LIGNEES_QUI_LISENT_ALTITUDE = new Set([
  "deduction_profondeur_hors_gel_altitude",
  "deduction_zone_neige_commune"
]);

/** La lignée d'un utilitaire : son nom, sans la version. */
function ligneeDe(reference) {
  const brut = texte(reference);
  const coupe = brut.lastIndexOf("_V");
  return coupe > 0 ? brut.slice(0, coupe) : brut;
}

/**
 * Ce qu'on sait relire, et selon quelle version.
 *
 * La clé est la **référence complète** — nom et version. Le jour où une `V2`
 * change la loi, la relecture ne s'applique plus : la contrainte tombe au rang
 * « à revérifier » au lieu d'être recalculée selon une loi qui n'est plus la
 * sienne. Mieux vaut dire « je ne sais pas » que rendre un chiffre d'après la
 * mauvaise règle.
 */
const RELECTURES = {
  deduction_profondeur_hors_gel_altitude_V1: {
    /** H0 se simplifie : l'écart suffit. Deux décimales, comme l'utilitaire les écrit. */
    relire({ valeur, altitudeDepart, altitude }) {
      const metres = lireUnNombre(valeur);
      if (!Number.isFinite(metres)) return null;
      const nouvelle = metres + (altitude - altitudeDepart) / 4000;
      return { valeur: `${nouvelle.toFixed(2)} m` };
    }
  },

  deduction_zone_neige_commune_V1: {
    /**
     * La zone ne bouge pas : elle vient d'une table communale, que l'altitude ne
     * touche pas. Ce qui bouge est la **réserve** — au-delà de 900 m, l'Annexe
     * Nationale demande une étude. Une valeur identique dont la réserve apparaît
     * n'est pas une valeur inchangée, et l'écran doit le dire.
     */
    relire({ valeur, altitude, reserves }) {
      const retenues = new Set(reserves.filter((code) => code !== RESERVE.ALTITUDE_HORS_TABLE));
      if (altitude > 900) retenues.add(RESERVE.ALTITUDE_HORS_TABLE);
      return { valeur: texte(valeur), reserves: [...retenues].sort() };
    }
  }
};

/** Les réserves déjà portées par une contrainte, nettoyées de ce qu'on ne connaît pas. */
function reservesDe(assertion) {
  const brutes = assertion?.payload?.reserves;
  return (Array.isArray(brutes) ? brutes : []).map(texte).filter((code) => RESERVES.includes(code));
}

/** L'altitude sur laquelle une contrainte déduite a été calculée, ou `null`. */
function altitudeDeLEntree(assertion) {
  const metres = lireUnNombre(assertion?.payload?.inputs?.altitude);
  return Number.isFinite(metres) ? metres : null;
}

/**
 * Une contrainte du site que l'altitude concerne.
 *
 * Deux façons de le savoir, et il faut les deux : la contrainte **garde**
 * l'altitude sur laquelle elle a été calculée, ou bien l'utilitaire qui l'a
 * déduite est d'une lignée qui lit l'altitude. La première seule laissait
 * disparaître toutes celles versées avant qu'on conserve les entrées.
 */
export function litLAltitude(assertion) {
  if (texte(assertion?.kind) !== DERIVED_CONSTRAINT_KIND) return false;
  if (altitudeDeLEntree(assertion) !== null) return true;
  return LIGNEES_QUI_LISENT_ALTITUDE.has(ligneeDe(assertion?.payload?.utilitaire));
}

/** Ce qui manque à une contrainte pour être relue : son altitude de départ. */
export const SANS_ENTREE = "ce calcul ne dit pas sur quelle altitude il a été fait";

/**
 * Pourquoi une contrainte concernée n'a pas pu être relue.
 *
 * La phrase est rendue à l'écran telle quelle : « à revérifier » sans motif est
 * une inquiétude sans adresse, et l'on ne sait pas s'il faut corriger la donnée
 * ou l'outil.
 */
export function pourquoiPasRelue(assertion) {
  const utilitaire = texte(assertion?.payload?.utilitaire);
  if (!utilitaire) return "cette contrainte ne dit pas quel utilitaire l'a déduite";
  if (!RELECTURES[utilitaire]) {
    return `nous ne savons pas rejouer ${utilitaire} — seule la version dont nous connaissons la loi est relue`;
  }
  return SANS_ENTREE;
}

/**
 * Une contrainte relue sous la nouvelle altitude, ou `null` si on ne sait pas.
 *
 * Rendre `null` n'est pas un échec : c'est le refus de recalculer d'après une
 * loi qu'on ne connaît pas, et il fait tomber la contrainte au rang « à
 * revérifier », où elle est nommée sans être devinée.
 */
export function relireLaContrainte(assertion, altitude, { supposerDepuis = null } = {}) {
  const relecture = RELECTURES[texte(assertion?.payload?.utilitaire)];
  if (!relecture) return null;

  const enregistree = altitudeDeLEntree(assertion);
  // La supposition n'est jamais prise d'office : l'appelant la demande, et la
  // ligne rendue la porte pour que l'écran ne puisse pas l'oublier en chemin.
  const suppose = enregistree === null && Number.isFinite(supposerDepuis);
  const altitudeDepart = enregistree ?? (suppose ? supposerDepuis : null);
  if (altitudeDepart === null || !Number.isFinite(altitude)) return null;

  const avant = texte(assertion?.payload?.value);
  const reservesAvant = reservesDe(assertion);
  const rendu = relecture.relire({ valeur: avant, altitudeDepart, altitude, reserves: reservesAvant });
  if (!rendu || !texte(rendu.valeur)) return null;

  const reservesApres = Array.isArray(rendu.reserves) ? rendu.reserves : reservesAvant;
  const apres = texte(rendu.valeur);

  return {
    assertion,
    sujet: texte(assertion?.payload?.subject) || texte(assertion?.statement),
    utilitaire: texte(assertion?.payload?.utilitaire),
    avant,
    apres,
    valeurABouge: apres !== avant,
    reservesAvant,
    reservesApres,
    // Une réserve qui apparaît ou disparaît compte : c'est un doute qui naît ou
    // qui s'éteint, et le taire ferait passer pour identique une valeur dont on
    // ne se méfie plus de la même façon.
    reservesOntBouge: reservesAvant.join("|") !== reservesApres.join("|"),
    altitudeDepart,
    /** Vrai quand l'altitude de départ n'était pas conservée et qu'on l'a supposée. */
    suppose
  };
}

/**
 * Ce que les relectures connues savent faire de ces substitutions.
 *
 * Elles ne se déclenchent que si l'**altitude** est parmi les valeurs qu'on fait
 * varier : c'est la seule entrée dont ce fichier connaisse la loi. Pour toute
 * autre valeur, les contraintes d'utilitaire restent opaques, et le disent.
 *
 * @param {object} options
 * @param {object[]} options.enVigueur la mémoire qui vaut aujourd'hui
 * @param {Map<string, string>} options.substitutions affirmation → valeur imposée
 * @param {boolean} [options.supposer] accepter de supposer l'altitude de départ
 * @returns {{concerne: boolean, recalculees: object[], refusees: object[], supposables: number}}
 */
export function relecturesConnues({ enVigueur = [], substitutions = new Map(), supposer = false } = {}) {
  const rien = { concerne: false, recalculees: [], refusees: [], supposables: 0 };

  const altitudeDite = enVigueur.find(
    (assertion) => estLAltitude(assertion) && substitutions.has(texte(assertion.id))
  );
  if (!altitudeDite) return rien;

  const metres = lireUnNombre(substitutions.get(texte(altitudeDite.id)));
  if (!Number.isFinite(metres)) return rien;

  const depart = lireUnNombre(altitudeDite?.payload?.value);
  const recalculees = [];
  const refusees = [];

  for (const assertion of enVigueur) {
    if (!litLAltitude(assertion)) continue;
    const relue = relireLaContrainte(assertion, metres, {
      supposerDepuis: supposer && Number.isFinite(depart) ? depart : null
    });
    if (relue) recalculees.push(relue);
    else refusees.push(assertion);
  }

  return {
    concerne: true,
    recalculees,
    refusees,
    // Combien ne manquent que de leur altitude de départ : de quoi proposer la
    // supposition plutôt que de la prendre.
    supposables: refusees.filter((assertion) => pourquoiPasRelue(assertion) === SANS_ENTREE).length
  };
}
