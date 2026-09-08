/**
 * Rejouer un utilitaire avec des valeurs essayées — pour de vrai.
 *
 * ## Ce que ce module remplace, et pourquoi il fallait le faire
 *
 * La variante ne savait rejouer que **deux** utilitaires, et elle les rejouait en
 * recopiant leur loi à la main dans le navigateur : un écart d'altitude divisé par
 * 4000 pour la profondeur hors gel, un seuil à 900 m pour la réserve de la zone de
 * neige. Tout le reste tombait dans « à revérifier ».
 *
 * C'était intenable pour trois raisons, et la troisième est la pire :
 *
 * 1. **Ça ne montait pas.** Une table de correspondance qui s'allonge d'un cas par
 *    utilitaire, c'est réécrire le serveur dans le navigateur, un fichier à la fois.
 * 2. **Ça mentait au premier changement de version.** Une `V2` qui change la loi
 *    laissait la copie du navigateur rendre l'ancienne, sans que rien le dise.
 * 3. **Ça vidait la variante de son intérêt.** Sur un projet dont le raisonnement
 *    passe surtout par des utilitaires, « essayer une altitude » ne rendait presque
 *    rien — quelques noms « à revérifier », et l'utilisateur devant recalculer à la
 *    main ce que l'outil existe pour calculer.
 *
 * ## Ce qu'on fait à la place : on redemande au serveur, sans écrire
 *
 * L'outil qui a produit la contrainte sait la refaire. Il lui manquait le droit de
 * **calculer sans rien écrire** — sans quoi il n'y avait que deux issues, toutes
 * deux mauvaises : écrire le fait de contexte, et une valeur essayée entrerait dans
 * le projet sans que personne l'ait décidée ; ou recopier la loi, et les deux
 * copies divergeraient.
 *
 * `resolve-climate-tool` accepte donc `dry_run`. Même table, même version, même
 * loi ; rien n'entre nulle part. Et il rend le **fait de contexte** qu'il aurait
 * écrit, si bien que l'utilitaire le relit avec sa propre fonction `deduire` — la
 * même qu'au versement. Il n'y a plus une seule ligne de loi métier ici.
 *
 * ## Le rejeu part du dernier appel, avec une valeur changée
 *
 * Une variante, c'est exactement cela : *le même appel que la dernière fois, avec
 * une valeur différente*. On relit donc l'appel conservé dans
 * `project_tool_results.input_payload`, on y remplace ce qu'on fait varier, et on
 * redemande. Reconstruire l'adresse de mémoire aurait redit ce qui est déjà écrit.
 *
 * ## Ce qui ne se rejoue pas se **nomme**
 *
 * Un sujet déclaré sans `entree` n'entre pas dans l'appel — H0 en est un : le
 * serveur le choisit lui-même dans sa table, et le lui imposer lui ferait dire
 * autre chose que le DTU. Un projet sans appel conservé, un outil injoignable, un
 * utilitaire sans `rejeu` : autant de cas où l'on rend un refus **motivé**, jamais
 * un chiffre. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien
 * (`docs/fondamentaux.md`, règle 5) — mais ne pas savoir n'autorise pas non plus à
 * inventer.
 */

import { DERIVED_CONSTRAINT_KIND, inputsStateOf } from "./derived-constraints.js";
import { RESERVES } from "../utilitaires/reserves.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { lireUnNombre } from "./memoire-en-texte.js";
import { utilitaireByReference } from "../utilitaires/catalogue.js";
import { lecturesDeLUtilitaire } from "./memoire-applications.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi une contrainte concernée n'a pas pu être rejouée. Rendu tel quel à l'écran. */
export const REFUS = {
  /** L'utilitaire ne dit pas comment se rejouer. */
  SANS_REJEU: "sans-rejeu",
  /** Le sujet varié n'entre pas dans l'appel : le serveur le choisit lui-même. */
  ENTREE_IMPOSSIBLE: "entree-impossible",
  /** Aucun appel conservé : on ne sait pas quelle adresse redemander. */
  SANS_APPEL: "sans-appel",
  /** L'outil n'a pas répondu, ou a répondu autre chose. */
  INJOIGNABLE: "injoignable",
  /** La valeur essayée ne se lit pas comme le champ l'attend. */
  VALEUR_ILLISIBLE: "valeur-illisible"
};

const PHRASES = {
  [REFUS.SANS_REJEU]: "cet utilitaire ne sait pas se rejouer : son calcul reste au serveur",
  [REFUS.ENTREE_IMPOSSIBLE]:
    "cette valeur n'entre pas dans son calcul — le serveur la choisit lui-même, et la lui imposer "
    + "lui ferait dire autre chose que son référentiel",
  [REFUS.SANS_APPEL]: "aucun appel conservé pour cet outil : on ne sait pas quoi redemander",
  [REFUS.INJOIGNABLE]: "l'outil n'a pas répondu : sa valeur d'aujourd'hui reste affichée",
  [REFUS.VALEUR_ILLISIBLE]:
    "son calcul attend un nombre, et la valeur essayée ne s'en lit pas comme un — la lui passer "
    + "quand même la ferait retomber sur zéro"
};

/** La phrase d'un refus, en français. Un refus sans motif est une inquiétude sans adresse. */
export function phraseDuRefus(motif) {
  return PHRASES[texte(motif)] ?? "";
}

/** Une contrainte déduite du site, seule chose qu'un utilitaire produise ici. */
const estDeduite = (assertion) =>
  texte(assertion?.kind) === DERIVED_CONSTRAINT_KIND && texte(assertion?.payload?.utilitaire) !== "";

/** Les réserves d'un rendu, nettoyées de ce qu'on ne connaît pas. */
function reservesDe(brutes) {
  return (Array.isArray(brutes) ? brutes : []).map(texte).filter((code) => RESERVES.includes(code));
}

/**
 * Ce que la variante change dans l'appel d'un utilitaire.
 *
 * On croise les **sujets variés** avec ce que l'utilitaire déclare lire. Un sujet
 * déclaré sans `entree` est reconnu mais refusé : il concerne le calcul sans
 * pouvoir y entrer.
 *
 * @returns {{champs: object, refus: string}} les champs de l'appel à remplacer, ou
 *   un motif de refus quand le sujet varié ne peut pas y entrer
 */
export function champsDeLAppel(assertion, substituees = new Map()) {
  const outil = utilitaireByReference(texte(assertion?.payload?.utilitaire));
  const declarees = Array.isArray(outil?.lit) ? outil.lit : [];
  const champs = {};
  let bloque = "";

  for (const declaree of declarees) {
    const valeur = substituees.get(cleDuSujet(declaree?.sujet));
    if (valeur === undefined) continue;
    if (!texte(declaree?.entree)) { bloque = REFUS.ENTREE_IMPOSSIBLE; continue; }

    // Un champ qui attend un nombre en reçoit un. « 1200 m » se lit ici, et ce
    // qui ne se lit pas est **refusé** plutôt que laissé passer : plus loin, une
    // valeur illisible devient zéro sans un mot, et zéro se calcule très bien
    // jusqu'à une cote de fondation fausse.
    if (declaree?.nombre === true) {
      const metres = lireUnNombre(valeur);
      if (!Number.isFinite(metres)) { bloque = REFUS.VALEUR_ILLISIBLE; continue; }
      champs[texte(declaree.entree)] = metres;
      continue;
    }

    champs[texte(declaree.entree)] = valeur;
  }

  return { champs, refus: Object.keys(champs).length ? "" : bloque };
}

/**
 * Les contraintes qu'une variante concerne, et ce qu'il faudrait redemander.
 *
 * Pure : elle ne parle à personne. C'est elle qui décide ce qui est concerné, et
 * `rejouerLesUtilitaires` ne fait qu'exécuter ce qu'elle a décidé.
 */
export function contraintesAReprendre({ enVigueur = [], substitutions = new Map() } = {}) {
  const voulues = substitutions instanceof Map ? substitutions : new Map(Object.entries(substitutions ?? {}));
  const parId = new Map((Array.isArray(enVigueur) ? enVigueur : []).map((a) => [texte(a?.id), a]));

  // Les sujets variés, par clé : c'est par le sujet que les utilitaires déclarent,
  // et une comparaison sur l'identifiant manquerait la déclaration.
  const substituees = new Map();
  for (const [id, valeur] of voulues) {
    const sujet = cleDuSujet(parId.get(texte(id))?.payload?.subject);
    if (sujet) substituees.set(sujet, texte(valeur));
  }
  if (!substituees.size) return [];

  const reprises = [];

  for (const assertion of Array.isArray(enVigueur) ? enVigueur : []) {
    if (!estDeduite(assertion)) continue;

    // Concernée : elle déclare lire l'un des sujets qu'on fait varier.
    const lues = lecturesDeLUtilitaire(assertion).map(cleDuSujet);
    if (!lues.some((sujet) => substituees.has(sujet))) continue;

    const outil = utilitaireByReference(texte(assertion?.payload?.utilitaire));
    const { champs, refus } = champsDeLAppel(assertion, substituees);

    reprises.push({
      assertion,
      sujet: texte(assertion?.payload?.subject) || texte(assertion?.statement),
      utilitaire: texte(assertion?.payload?.utilitaire),
      outil: texte(outil?.rejeu?.outil),
      champs,
      refus: refus || (texte(outil?.rejeu?.outil) ? "" : REFUS.SANS_REJEU)
    });
  }

  return reprises;
}

/**
 * Ce qu'une contrainte devient, une fois son utilitaire rejoué.
 *
 * Pure aussi : elle reçoit le fait de contexte que le serveur vient de rendre et le
 * fait relire par l'utilitaire — **sa propre fonction `deduire`**, la même qu'au
 * versement. C'est ce qui garantit qu'une variante et un versement ne peuvent pas
 * dire deux choses différentes de la même situation.
 */
export function relectureDuFait(reprise, fait) {
  const outil = utilitaireByReference(texte(reprise?.utilitaire));
  const rendu = outil?.deduire?.(fait ?? {});
  if (!rendu || !texte(rendu.valeur)) return null;

  const avant = texte(reprise?.assertion?.payload?.value);
  const apres = texte(rendu.valeur);
  const reservesAvant = reservesDe(reprise?.assertion?.payload?.reserves);
  const reservesApres = reservesDe(rendu.reserves);

  return {
    assertion: reprise.assertion,
    sujet: reprise.sujet,
    utilitaire: reprise.utilitaire,
    avant,
    apres,
    valeurABouge: apres !== avant,
    reservesAvant,
    reservesApres,
    // Une réserve qui apparaît ou disparaît compte : c'est un doute qui naît ou
    // qui s'éteint, et le taire ferait passer pour identique une valeur dont on ne
    // se méfie plus de la même façon.
    reservesOntBouge: reservesAvant.join("|") !== reservesApres.join("|"),
    inputsState: inputsStateOf(reservesApres)
  };
}

/**
 * Rejouer les utilitaires que cette variante concerne.
 *
 * Le seul point de ce module qui parle au serveur. Il rend la même forme que ce que
 * `consequencesDeLaVariante` attend, si bien que le cœur de la variante reste pur et
 * synchrone : le réseau se fait une fois, avant, et le calque n'en sait rien.
 *
 * @param {object} options
 * @param {string} options.projectId
 * @param {object[]} options.enVigueur la mémoire qui vaut aujourd'hui
 * @param {Map<string, string>} options.substitutions affirmation → valeur essayée
 * @param {Function} [options.appeler] injecté par les tests ; sinon l'outil réel
 * @param {Function} [options.dernierAppel] injecté par les tests ; sinon la base
 * @returns {Promise<{recalculees: object[], refusees: object[]}>}
 */
export async function rejouerLesUtilitaires({
  projectId = "", enVigueur = [], substitutions = new Map(), appeler = null, dernierAppel = null
} = {}) {
  const reprises = contraintesAReprendre({ enVigueur, substitutions });
  const vide = { recalculees: [], refusees: [] };
  if (!reprises.length) return vide;

  const outils = await import("./studio-tools-service.js").catch(() => null);
  const demander = appeler ?? outils?.resolveStudioClimateTool;
  const relire = dernierAppel ?? outils?.getLastStudioToolResult;
  if (typeof demander !== "function" || typeof relire !== "function") {
    return { recalculees: [], refusees: reprises.map((r) => ({ ...r, refus: REFUS.INJOIGNABLE })) };
  }

  // Le dernier appel de chaque outil, une fois pour toutes : deux contraintes du
  // même outil ne le redemandent pas deux fois.
  const appels = new Map();
  const appelDe = async (outil) => {
    if (!appels.has(outil)) {
      appels.set(outil, await relire({ projectId, toolKey: outil }).catch(() => null));
    }
    return appels.get(outil);
  };

  const recalculees = [];
  const refusees = [];

  for (const reprise of reprises) {
    if (reprise.refus) { refusees.push(reprise); continue; }

    const precedent = await appelDe(reprise.outil);
    const adresse = precedent?.input_payload;
    if (!adresse || typeof adresse !== "object") {
      refusees.push({ ...reprise, refus: REFUS.SANS_APPEL });
      continue;
    }

    try {
      // Le même appel que la dernière fois, avec la valeur essayée à la place. Et
      // `dryRun` : rien n'entre nulle part.
      const reponse = await demander({
        projectId,
        toolKey: reprise.outil,
        location: { ...adresse, ...reprise.champs },
        dryRun: true
      });

      const relue = relectureDuFait(reprise, reponse?.context_fact ?? null);
      if (relue) recalculees.push(relue);
      else refusees.push({ ...reprise, refus: REFUS.INJOIGNABLE });
    } catch {
      // Un outil qui ne répond pas laisse sa valeur d'aujourd'hui affichée, et le
      // dit. Une variante partielle qui se dit partielle vaut mieux qu'un échec.
      refusees.push({ ...reprise, refus: REFUS.INJOIGNABLE });
    }
  }

  return { recalculees, refusees };
}
