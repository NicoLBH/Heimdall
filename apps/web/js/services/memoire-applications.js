/**
 * Ce qu'une règle a lu pour conclure — une ligne par lecture.
 *
 * ## Ce que ce module remplace
 *
 * Les liens de dépendance se reconstruisaient **par nom, à chaque lecture** :
 * `dependancesDeLaMemoire()` rapprochait « si Hauteur du plancher bas ≤ 28 m »
 * d'une affirmation dont le sujet s'écrit pareil. Trois choses en découlaient, et
 * la troisième bloquait tout le reste : un sujet renommé faisait disparaître le
 * lien en silence, on ne pouvait pas **compter** les emplois d'une donnée, et on
 * ne pouvait pas les **ordonner** — donc pas de plan de recalcul, donc pas de
 * rejeu. Voir `docs/rejouer-la-memoire.md`, étape 1.
 *
 * Ce module construit les lignes ; il n'écrit rien. Il est pur.
 *
 * ## Ce que « enregistré » veut dire, exactement
 *
 * Le moteur qui applique les règles ne travaille pas sur la mémoire : il
 * travaille sur un questionnaire, et il rend des conditions portant des **noms**.
 * Il n'a donc aucun identifiant à nous donner, et cette étape ne prétend pas le
 * contraire.
 *
 * Ce qu'elle change est ailleurs, et c'est l'essentiel : le nom est résolu **une
 * fois, au moment du versement**, contre la mémoire contemporaine de la règle —
 * les valeurs qu'elle a réellement vues —, puis conservé. Après quoi il ne bouge
 * plus. Une lecture faite en mars continue de désigner ce que mars affirmait,
 * même si le sujet est renommé en juin, même si la valeur est remplacée en
 * juillet. C'est la sémantique que `assertion_dependencies` documente déjà :
 * « la note repose sur la valeur A2 telle qu'elle était affirmée le 12 août ».
 *
 * Reconstruire après coup, pour la mémoire versée avant cette table, résout les
 * mêmes noms contre la mémoire d'**aujourd'hui**. C'est une approximation, elle
 * porte `reconstruit`, et l'écran doit le dire : confondre les deux ferait passer
 * pour établi un lien qui n'est qu'une ressemblance de noms.
 *
 * ## Un appel, c'est une règle et une zone
 *
 * Une règle **appliquée** dépend de la zone : l'escalier A classé en 3ᵉ famille B
 * et l'escalier B classé en 2ᵉ ne suivent pas les mêmes articles. La même règle
 * sur trois zones fait donc trois appels, et neuf lectures si elle lit trois
 * faits. Compter sans les zones ne voudrait rien dire.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { zonesLisibles } from "./memoire-blame.js";
import { normalizeZoneKey } from "./project-zones.js";
import { sujetDe } from "./memoire-raisonnement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** D'où vient le lien. Les deux ne se valent pas, et l'écran le dit. */
export const RESOLUTION = {
  /** Résolu au versement, contre la mémoire que la règle a vue. Conservé tel quel. */
  ENREGISTRE: "enregistre",
  /** Résolu après coup, contre la mémoire d'aujourd'hui. Une approximation. */
  RECONSTRUIT: "reconstruit"
};

/** Une règle appliquée se reconnaît à son instantané. */
const estUneRegle = (assertion) => assertion?.payload?.referentiel === true;

/** Ce qui vaut encore : une ligne remplacée ne décrit plus l'état. */
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/** Les zones d'une affirmation, en clés, ou `[]` pour « partout ». */
function porteesDe(assertion) {
  return [...new Set(zonesLisibles(assertion).map(normalizeZoneKey).filter(Boolean))];
}

/**
 * Cette affirmation vaut-elle dans cette zone ?
 *
 * Une affirmation sans portée vaut partout — c'est une portée, pas une
 * ignorance. Une affirmation portée ne vaut que là où elle est portée.
 */
function vautDans(assertion, zone) {
  const portees = porteesDe(assertion);
  if (!portees.length) return true;
  if (!zone) return false;
  return portees.includes(zone);
}

/**
 * Les noms qu'une règle a lus, dans l'ordre où elle les lit.
 *
 * Les conditions d'abord, les exceptions ensuite : c'est l'ordre du texte, et
 * c'est celui qu'on veut retrouver dans le rang. Un même nom lu deux fois fait
 * deux lectures — c'est précisément ce qu'on ne savait pas dire.
 */
export function lecturesDeLaRegle(regle = {}) {
  const bloc = regle?.payload?.regle ?? {};
  const toutes = [
    ...(Array.isArray(bloc.conditions) ? bloc.conditions : []),
    ...(Array.isArray(bloc.sauf) ? bloc.sauf : [])
  ];

  return toutes
    .map((condition) => texte(condition?.sujet))
    .filter(Boolean);
}

/**
 * Ce qu'un nom désignait, dans cette zone.
 *
 * Deux préférences, dans cet ordre. **La même proposition d'abord** : une règle
 * versée avec les valeurs qu'elle a produites a lu celles-là, pas celles
 * qu'elles remplacent. **La zone ensuite** : une valeur portée ici l'emporte sur
 * une valeur qui vaut partout, parce qu'elle est plus précise.
 *
 * On ne remonte jamais à une autre zone : emprunter la valeur du bâtiment voisin
 * serait le pire des mensonges — elle se lirait comme la valeur d'ici.
 */
function resoudre(nom, { parSujet, zone, propositionId }) {
  const candidates = (parSujet.get(cleDuSujet(nom)) ?? []).filter((assertion) => vautDans(assertion, zone));
  if (!candidates.length) return null;

  const memeVersement = propositionId
    ? candidates.filter((assertion) => texte(assertion.proposition_id) === texte(propositionId))
    : [];
  const pool = memeVersement.length ? memeVersement : candidates;

  const portees = pool.filter((assertion) => porteesDe(assertion).length);
  return (portees.length ? portees : pool)[0] ?? null;
}

/**
 * Les lectures de toute une mémoire, prêtes à écrire.
 *
 * @param {object[]} assertions la mémoire, telle qu'elle est après le versement
 * @param {object} [options]
 * @param {string} [options.projectId]
 * @param {string} [options.resolution] `RESOLUTION.ENREGISTRE` au versement,
 *   `RESOLUTION.RECONSTRUIT` pour rattraper l'existant
 * @param {string} [options.propositionId] le versement en cours, s'il y en a un
 * @param {Set<string>|string[]|null} [options.sorties] n'écrire que les appels
 *   qui produisent ces affirmations-là. Au versement, ce sont celles qu'on vient
 *   d'écrire : réécrire les appels de toute la mémoire à chaque fusion
 *   remplacerait des liens enregistrés par des liens reconstruits.
 * @returns {object[]} les lignes de `assertion_applications`
 */
export function applicationsDeLaMemoire(assertions = [], {
  projectId = "",
  resolution = RESOLUTION.RECONSTRUIT,
  propositionId = null,
  sorties = null
} = {}) {
  const toutes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);
  const retenues = sorties ? new Set([...sorties].map(texte).filter(Boolean)) : null;

  const parSujet = new Map();
  const regles = [];

  for (const assertion of toutes) {
    const cle = cleDuSujet(sujetDe(assertion));
    if (!cle) continue;
    if (estUneRegle(assertion)) { regles.push(assertion); continue; }
    if (!parSujet.has(cle)) parSujet.set(cle, []);
    parSujet.get(cle).push(assertion);
  }

  const lignes = [];
  const projet = texte(projectId);

  for (const regle of regles) {
    const noms = lecturesDeLaRegle(regle);
    if (!noms.length) continue;

    // Une règle sans portée a servi une fois, partout : `""` est cette portée-là.
    const zones = porteesDe(regle);
    const appels = zones.length ? zones : [""];

    for (const zone of appels) {
      const sortie = resoudre(sujetDe(regle), {
        parSujet, zone, propositionId: texte(regle.proposition_id)
      });
      // Une règle qui n'a rien produit dans cette zone n'y a pas servi. On ne
      // rattache pas ses lectures à la valeur d'une autre zone.
      if (!sortie?.id) continue;
      if (retenues && !retenues.has(texte(sortie.id))) continue;

      noms.forEach((nom, index) => {
        const entree = resoudre(nom, { parSujet, zone, propositionId: texte(regle.proposition_id) });

        lignes.push({
          project_id: projet || texte(sortie.project_id),
          rule_assertion_id: texte(regle.id) || null,
          output_assertion_id: texte(sortie.id),
          // `null` n'est pas un oubli : le nom ne désignait rien que le projet
          // ait versé. C'est le trou du raisonnement, et il se compte.
          input_assertion_id: texte(entree?.id) || null,
          input_subject: nom,
          input_rank: index + 1,
          zone,
          utility: texte(regle.payload?.utilitaire) || null,
          proposition_id: texte(propositionId) || texte(regle.proposition_id) || null,
          resolution
        });
      });
    }
  }

  return lignes;
}

/**
 * Ce qu'un versement ajoute au graphe.
 *
 * Les appels se résolvent contre la mémoire **d'après** le versement — une règle
 * versée avec les valeurs qu'elle produit a lu celles-là — mais on n'écrit que
 * les appels des lignes qu'on vient d'écrire. Le reste de la mémoire garde les
 * siens, résolus en leur temps.
 */
export function applicationsDuVersement({
  memoire = [], ecrites = [], projectId = "", propositionId = null
} = {}) {
  const nouvelles = Array.isArray(ecrites) ? ecrites : [];
  if (!nouvelles.length) return [];

  // La mémoire d'après, sans doublon : une ligne réécrite ne doit pas peser deux
  // fois dans la résolution.
  const parId = new Map();
  for (const assertion of [...(Array.isArray(memoire) ? memoire : []), ...nouvelles]) {
    const id = texte(assertion?.id);
    if (id) parId.set(id, assertion);
  }

  return applicationsDeLaMemoire([...parId.values()], {
    projectId,
    propositionId,
    resolution: RESOLUTION.ENREGISTRE,
    sorties: nouvelles.map((assertion) => texte(assertion?.id)).filter(Boolean)
  });
}

/**
 * Les liens de dépendance que ces lectures dessinent.
 *
 * Le format est celui de `assertion_dependencies`, pour que les lecteurs — le
 * drapeau « à revérifier », le compte des dépendants — n'aient pas à savoir d'où
 * le lien vient. Une lecture dont le nom ne désignait rien ne fait pas de lien :
 * on ne dépend pas de ce qui n'existe pas.
 *
 * Dédupliqué, parce qu'un lien dit « repose sur », pas « combien de fois » : le
 * compte se lit sur les lectures, qui le portent.
 */
export function dependancesDesApplications(applications = []) {
  const vus = new Set();
  const liens = [];

  for (const ligne of Array.isArray(applications) ? applications : []) {
    const cible = texte(ligne?.output_assertion_id);
    const socle = texte(ligne?.input_assertion_id);
    if (!cible || !socle || cible === socle) continue;

    const marque = `${cible}<-${socle}`;
    if (vus.has(marque)) continue;
    vus.add(marque);
    liens.push({ assertion_id: cible, depends_on_assertion_id: socle, declared_by: null });
  }

  return liens;
}

/**
 * Ce qui emploie chaque nom, avec le compte exact.
 *
 * C'est la question qu'on pose devant une donnée de base — « qui s'en sert ? » —
 * et c'est la même table lue par l'autre bout. Le compte porte sur les
 * **lectures**, pas sur les fonctions : une règle qui lit deux fois le même nom
 * s'en sert deux fois.
 *
 * @returns {Map<string, {sujet: string, lectures: number, sorties: Set<string>, zones: Set<string>}>}
 */
export function emploisParSujet(applications = []) {
  const emplois = new Map();

  for (const ligne of Array.isArray(applications) ? applications : []) {
    const nom = texte(ligne?.input_subject);
    const cle = cleDuSujet(nom);
    if (!cle) continue;

    if (!emplois.has(cle)) {
      emplois.set(cle, { sujet: nom, lectures: 0, sorties: new Set(), zones: new Set(), orphelines: 0 });
    }
    const emploi = emplois.get(cle);
    emploi.lectures += 1;
    if (texte(ligne.output_assertion_id)) emploi.sorties.add(texte(ligne.output_assertion_id));
    emploi.zones.add(texte(ligne.zone));
    // Une lecture dont le nom ne désigne rien : elle compte, et elle se signale.
    if (!texte(ligne.input_assertion_id)) emploi.orphelines += 1;
  }

  return emplois;
}
