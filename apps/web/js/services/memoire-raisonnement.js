/**
 * Comment on en est arrivé là.
 *
 * ## La question
 *
 * On lit dans `incendie.ctr` : « Blocs-portes des ensembles celliers ou caves =
 * CF 1/2 h ». Très bien — **comment ?** La provenance dit d'où la valeur sort
 * (« règle : Blocs-portes… »), mais pas ce que cette règle a lu, ni ce qui a
 * mené aux valeurs qu'elle a lues. Il fallait ouvrir les fichiers un par un et
 * remonter le fil à la main.
 *
 * ```
 * données de base employées  →  enchaînement des fonctions  →  résultat
 * ```
 *
 * Ce fichier reconstruit cet enchaînement.
 *
 * ## Comment il le reconstruit
 *
 * Il n'y a rien à stocker : la chaîne est **entièrement contenue** dans ce que
 * la mémoire porte déjà. Une règle produit un sujet ; ses conditions citent
 * d'autres sujets ; chacun de ceux-là est produit par une autre règle, ou bien
 * relevé quelque part. On remonte donc de proche en proche, et l'on s'arrête
 * sur ce qui n'est produit par rien — c'est-à-dire sur les données de base.
 *
 * Le stocker en ferait une seconde vérité, qui divergerait au premier versement
 * (`docs/fondamentaux.md`, règle 4). Ce qui est dérivé se recalcule tant qu'il
 * sert à décider.
 *
 * ## La zone n'est pas un détail
 *
 * Une variable n'a pas *une* valeur, elle en a une par partie d'ouvrage. Une
 * chaîne se lit donc toujours **pour une zone** : celle de la contrainte qu'on
 * regarde. À défaut, la valeur qui vaut partout — et si aucune ne vaut ici, on
 * le dit plutôt que d'en emprunter une à la zone voisine.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { TOUTES_ZONES } from "./memoire-en-texte.js";
import { zonesLisibles } from "./memoire-blame.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une affirmation affirme, en clair. */
export function sujetDe(assertion) {
  return texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
}

/** Une règle appliquée se reconnaît à son instantané. */
const estUneRegle = (assertion) => assertion?.payload?.referentiel === true;

/** Ce qui vaut encore : une ligne remplacée ne décrit plus l'état. */
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/**
 * Les règles du projet, par le sujet qu'elles produisent.
 *
 * Une seule par sujet : deux règles qui produiraient le même nom seraient une
 * contradiction, pas une alternative — et c'est l'arbitrage d'une proposition
 * qui doit la trancher, pas cette lecture.
 */
export function reglesQuiProduisent(assertions = []) {
  const regles = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (!estUneRegle(assertion) || !enVigueur(assertion)) continue;
    const cle = cleDuSujet(sujetDe(assertion));
    if (cle && !regles.has(cle)) regles.set(cle, assertion);
  }

  return regles;
}

/**
 * Ce qu'un sujet vaut, dans cette zone.
 *
 * La zone d'abord, « Toutes zones » ensuite. Emprunter la valeur d'une autre
 * zone serait le pire des mensonges : elle se lirait comme la valeur d'ici.
 *
 * @returns {{valeur: string, zone: string, assertion: object}|null}
 */
export function valeurDuSujet(sujet, assertions = [], zone = "") {
  const cherche = cleDuSujet(sujet);
  if (!cherche) return null;

  const dites = (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => enVigueur(assertion) && !estUneRegle(assertion))
    .filter((assertion) => cleDuSujet(sujetDe(assertion)) === cherche);

  const dansLaZone = texte(zone)
    ? dites.find((assertion) => zonesLisibles(assertion).some((portee) => texte(portee) === texte(zone)))
    : null;

  const partout = dites.find((assertion) => zonesLisibles(assertion).length === 0);
  const retenue = dansLaZone ?? partout ?? null;
  if (!retenue) return null;

  return {
    valeur: texte(retenue?.payload?.value) || texte(retenue?.statement),
    zone: dansLaZone ? texte(zone) : TOUTES_ZONES,
    assertion: retenue
  };
}

/**
 * La chaîne des fonctions qui mènent à un sujet.
 *
 * En **ordre de lecture** : ce dont une règle a besoin se lit avant elle, comme
 * on lit l'arrêté avant la note de synthèse. La règle demandée est donc la
 * dernière, et l'on descend depuis les données de base jusqu'à elle.
 *
 * Un cycle ne bloque pas : une règle déjà vue ne se réexplore pas. Un
 * référentiel mal versé ne doit pas figer l'écran — il doit se voir.
 *
 * @returns {{fonctions: object[], entrees: string[], manquants: string[]}}
 *   `entrees` : les noms sur lesquels la chaîne s'appuie sans qu'une règle les
 *   produise — les données de base. `manquants` : ceux que personne n'a versés.
 */
export function chaineDuRaisonnement(sujet, assertions = [], { zone = "" } = {}) {
  const regles = reglesQuiProduisent(assertions);
  const fonctions = [];
  const vues = new Set();
  const entrees = new Set();
  const manquants = new Set();

  const descendre = (nom) => {
    const cle = cleDuSujet(nom);
    if (!cle || vues.has(cle)) return;
    vues.add(cle);

    const regle = regles.get(cle);
    if (!regle) {
      // Rien ne le produit : c'est une entrée. Reste à savoir si quelqu'un l'a
      // versée — et si non, c'est le trou du raisonnement.
      entrees.add(texte(nom));
      if (!valeurDuSujet(nom, assertions, zone)) manquants.add(texte(nom));
      return;
    }

    const conditions = [
      ...(regle.payload?.regle?.conditions ?? []),
      ...(regle.payload?.regle?.sauf ?? [])
    ];
    for (const condition of conditions) descendre(texte(condition?.sujet));

    // Après ses entrées : on lit ce dont elle a besoin avant elle.
    fonctions.push(regle);
  };

  descendre(sujet);

  return { fonctions, entrees: [...entrees], manquants: [...manquants] };
}

/**
 * Ce que chaque ligne de code vaut, aujourd'hui, dans cette zone.
 *
 * ## Pourquoi des valeurs, et pas un verdict
 *
 * On pourrait afficher « vrai » ou « faux » en face de chaque condition. Ce
 * serait rejouer le référentiel dans le navigateur, avec ses unités, ses listes
 * et ses cas particuliers — et un verdict faux affiché avec aplomb est pire que
 * pas de verdict du tout. On montre donc **ce que le projet dit** de chaque nom
 * cité, et le lecteur compare : c'est lui qui décide, et il a la ligne sous les
 * yeux.
 *
 * @param {{jetons: object[]}[]} lignes les lignes affichées, à gauche
 * @returns {{sujet: string, valeur: string, zone: string, manquant: boolean}[]}
 *   une entrée par ligne, vide quand la ligne ne cite aucun nom
 */
export function traceDesLignes(lignes = [], { assertions = [], zone = "" } = {}) {
  return (Array.isArray(lignes) ? lignes : []).map((ligne) => {
    const jetons = ligne?.jetons ?? ligne ?? [];
    const nom = texte((jetons.find((jeton) => jeton?.type === "sujet") ?? {}).texte);
    if (!nom) return { sujet: "", valeur: "", zone: "", manquant: false };

    const dite = valeurDuSujet(nom, assertions, zone);
    return dite
      ? { sujet: nom, valeur: dite.valeur, zone: dite.zone, manquant: false }
      : { sujet: nom, valeur: "", zone: "", manquant: true };
  });
}
