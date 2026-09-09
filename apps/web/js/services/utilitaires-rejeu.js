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
import { lecturesDeLUtilitaire, agentDeLaFonction } from "./memoire-applications.js";

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
  VALEUR_ILLISIBLE: "valeur-illisible",
  /**
   * Une fonction native dont le projet ne porte pas les entrées.
   *
   * Le calcul est au serveur et il sait le refaire ; ce qu'il lui faut — le
   * tableau des massifs — n'a pas été versé. Une étude qui n'est pas dans la
   * mémoire ne se reprend pas, et le dire vaut mieux que de rendre zéro massif.
   */
  SANS_ENTREES: "sans-entrees"
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
    + "quand même la ferait retomber sur zéro",
  [REFUS.SANS_ENTREES]:
    "ce calcul sait se refaire, mais le projet ne porte pas ses entrées : verse l'étude, et la "
    + "variante la reprendra"
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
 * Les **fonctions natives** que cette variante concerne.
 *
 * ## Pourquoi elles ne passent pas par `contraintesAReprendre`
 *
 * Une contrainte déduite est sa propre sortie : l'utilitaire rend une valeur,
 * et c'est la ligne qu'on regardait. Une fonction native n'est pas une valeur —
 * c'est un **appel**, et ce qui change est le sujet qu'elle range. La sortie et
 * la fonction sont deux lignes de la mémoire, et c'est la première dont la
 * variante doit dire qu'elle a bougé.
 *
 * ## Ce qu'on rend, et pourquoi il faut les deux
 *
 * La fonction — elle porte l'utilitaire, sa version et ce qu'elle lit — **et** la
 * sortie, qui est la ligne que le calque remplace. Rendre l'une sans l'autre
 * ferait soit une valeur sans provenance, soit une provenance sans valeur.
 */
export function fonctionsAReprendre({ enVigueur = [], substitutions = new Map() } = {}) {
  const voulues = substitutions instanceof Map ? substitutions : new Map(Object.entries(substitutions ?? {}));
  const toutes = (Array.isArray(enVigueur) ? enVigueur : []).filter((a) => !texte(a?.superseded_by));
  const parId = new Map(toutes.map((a) => [texte(a?.id), a]));

  const substituees = new Map();
  for (const [id, valeur] of voulues) {
    const sujet = cleDuSujet(parId.get(texte(id))?.payload?.subject);
    if (sujet) substituees.set(sujet, texte(valeur));
  }
  if (!substituees.size) return [];

  // Les sujets de la mémoire, pour retrouver la sortie d'une fonction par son nom.
  const parSujet = new Map();
  for (const assertion of toutes) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key).split("@")[0]);
    if (cle && !parSujet.has(cle)) parSujet.set(cle, assertion);
  }

  const reprises = [];

  for (const fonction of toutes) {
    const native = agentDeLaFonction(fonction);
    if (!native) continue;

    const lues = (Array.isArray(native.lit) ? native.lit : []).map(cleDuSujet);
    if (!lues.some((sujet) => substituees.has(sujet))) continue;

    const outil = utilitaireByReference(texte(fonction?.payload?.utilitaire));
    const { champs, refus } = champsDeLAppel(fonction, substituees);
    const sortie = (Array.isArray(native.ecrit) ? native.ecrit : [])
      .map((ecrite) => parSujet.get(cleDuSujet(ecrite?.sujet)))
      .find(Boolean) ?? null;

    reprises.push({
      fonction,
      assertion: sortie,
      sujet: texte(sortie?.payload?.subject) || texte(native.ecrit?.[0]?.sujet),
      utilitaire: texte(fonction?.payload?.utilitaire),
      outil: texte(outil?.rejeu?.outil),
      // La zone de l'appel : une fonction sans portée a servi partout, et `""`
      // est cette portée-là.
      zone: (fonction?.payload?.zones ?? [])[0] ?? "",
      champs,
      refus: refus
        || (texte(outil?.rejeu?.outil) ? "" : REFUS.SANS_REJEU)
        || (sortie ? "" : REFUS.SANS_ENTREES)
    });
  }

  return reprises;
}

/**
 * Comment refaire un calcul natif, par outil.
 *
 * La liste est **fermée**, et c'est voulu : une fonction native est un contrat
 * particulier — ce qu'elle lit, ce qu'elle rend — et le brancher demande de
 * savoir les deux. Un outil absent d'ici rend `REFUS.SANS_REJEU`, ce qui est la
 * vérité : on sait qu'il dépend, on ne sait pas le refaire.
 */
const REPRISES = {
  fondations: {
    // Le service pur : ce qu'il faut relire du projet, et comment refaire le
    // tableau. Il ne parle à personne, et s'importe donc toujours.
    module: () => import("./fondations-reprise.js"),
    // L'aller-retour, séparé — et importé **seulement s'il sert**. Le lier au
    // module ferait échouer toute reprise là où le réseau n'existe pas : dans
    // les tests, qui passent leur propre calcul.
    appel: async () => {
      const service = await import("./fondations-service.js");
      return (semelles) => service.calculerLesSemelles(semelles);
    }
  }
};

/**
 * Une fonction native rejouée : le nouveau tableau, et ce qu'il vaut.
 *
 * Elle rend la même forme qu'une contrainte relue — `avant`, `apres`,
 * `valeurABouge` — pour que le cœur de la variante n'ait pas à distinguer les
 * deux. Le tableau voyage avec : c'est lui qu'un écran montrera, et le
 * recomposer plus tard demanderait de refaire l'appel.
 */
export async function repriseDeLaFonction(reprise, { assertions = [], appeler = null } = {}) {
  const branche = REPRISES[texte(reprise?.outil)];
  if (!branche) return null;

  const module = await branche.module();
  const tableau = module.tableauDuProjet(assertions, reprise.zone);
  if (!tableau) return { refus: REFUS.SANS_ENTREES };

  const refaite = await module.reprendreLEtude({
    tableau,
    profondeurHorsGel: reprise.champs?.profondeurHorsGel,
    calculer: appeler ?? await branche.appel()
  });
  if (!refaite) return null;

  const avant = texte(reprise?.assertion?.payload?.value);
  // Le tableau compte autant que la phrase qui le résume. Deux tableaux
  // différents peuvent se résumer pareil — enterrer un massif ne change ni son
  // volume ni son verdict —, et annoncer « rien n'a bougé » serait faux.
  const tableauAvant = reprise?.assertion?.payload?.tableau ?? null;
  const memeTableau = JSON.stringify(tableauAvant) === JSON.stringify(refaite.tableau);

  return {
    assertion: reprise.assertion,
    sujet: reprise.sujet,
    utilitaire: reprise.utilitaire,
    avant,
    apres: refaite.valeur,
    valeurABouge: refaite.valeur !== avant || !memeTableau,
    // Un calcul natif ne porte pas de réserves : sa loi ne descend pas, et
    // inventer un doute qu'il n'a pas exprimé serait pire que de se taire.
    reservesAvant: [],
    reservesApres: [],
    reservesOntBouge: false,
    // Le tableau d'après, pour qui voudra le montrer ligne à ligne.
    tableau: refaite.tableau
  };
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
 * Refaire les fonctions natives que cette variante concerne.
 *
 * Un appel par fonction, et chacune se débrouille : une étude non versée refuse
 * en le disant, un outil injoignable laisse la valeur d'aujourd'hui affichée.
 * Une variante partielle qui se dit partielle vaut mieux qu'un échec.
 */
async function reprendreLesFonctions({ enVigueur = [], substitutions = new Map(), appeler = null } = {}) {
  const reprises = fonctionsAReprendre({ enVigueur, substitutions });
  const recalculees = [];
  const refusees = [];

  for (const reprise of reprises) {
    if (reprise.refus) { refusees.push(reprise); continue; }

    try {
      const refaite = await repriseDeLaFonction(reprise, { assertions: enVigueur, appeler });
      if (refaite?.refus) refusees.push({ ...reprise, refus: refaite.refus });
      else if (refaite) recalculees.push(refaite);
      else refusees.push({ ...reprise, refus: REFUS.INJOIGNABLE });
    } catch {
      refusees.push({ ...reprise, refus: REFUS.INJOIGNABLE });
    }
  }

  return { recalculees, refusees };
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
  projectId = "", enVigueur = [], substitutions = new Map(),
  appeler = null, dernierAppel = null, calculer = null
} = {}) {
  const reprises = contraintesAReprendre({ enVigueur, substitutions });

  /**
   * Les fonctions natives se reprennent **en dernier**, et c'est tout le sujet.
   *
   * Une variante d'altitude ne touche pas les fondations directement : elle
   * change la profondeur hors gel, et c'est *elle* que le calcul lit. Reprendre
   * les fonctions avec les seules valeurs essayées ne les aurait donc jamais
   * atteintes — la chaîne se serait arrêtée au maillon d'avant, silencieusement.
   *
   * On leur passe donc les substitutions **augmentées de ce que les utilitaires
   * viennent d'établir**. C'est la même composition que fait le cœur de la
   * variante un cran plus loin, et pour la même raison.
   */
  const suite = async (recalculees) => reprendreLesFonctions({
    enVigueur,
    substitutions: new Map([
      ...(substitutions instanceof Map ? substitutions : new Map(Object.entries(substitutions ?? {}))),
      ...recalculees.map((ligne) => [texte(ligne?.assertion?.id), texte(ligne.apres)])
    ]),
    appeler: calculer
  });

  if (!reprises.length) {
    const seules = await suite([]);
    return { recalculees: seules.recalculees, refusees: seules.refusees };
  }

  const outils = await import("./studio-tools-service.js").catch(() => null);
  const demander = appeler ?? outils?.resolveStudioClimateTool;
  const relire = dernierAppel ?? outils?.getLastStudioToolResult;
  if (typeof demander !== "function" || typeof relire !== "function") {
    // Les utilitaires sont injoignables ; les fonctions natives, elles, ne
    // dépendent pas du même outil et peuvent encore se reprendre sur les seules
    // valeurs essayées.
    const seules = await suite([]);
    return {
      recalculees: seules.recalculees,
      refusees: [...seules.refusees, ...reprises.map((r) => ({ ...r, refus: REFUS.INJOIGNABLE }))]
    };
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

  // Et maintenant les fonctions natives, qui lisent ce qu'on vient d'établir.
  const fonctions = await suite(recalculees);

  return {
    recalculees: [...recalculees, ...fonctions.recalculees],
    refusees: [...refusees, ...fonctions.refusees]
  };
}
