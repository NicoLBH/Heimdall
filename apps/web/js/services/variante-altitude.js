/**
 * Essayer une altitude, et voir ce que le projet en dit — sans rien écrire.
 *
 * ## Pourquoi une variante, et pas une branche
 *
 * On a longtemps cru qu'il fallait des branches, comme sur un dépôt de code.
 * C'était une erreur, et elle avait une conséquence grave : deux vérités durables
 * pour un même ouvrage, donc le risque de commander du béton d'après la mauvaise.
 * Une branche suppose aussi qu'on sache **fusionner** — or fusionner des
 * décisions n'a pas d'algorithme : c'est ce qu'une proposition fait déjà, avec
 * quelqu'un qui tranche.
 *
 * Une variante est autre chose : une **lecture**. Rien n'est écrit, rien ne
 * coexiste. On substitue une valeur, on relit, on regarde, on sort. Ce module
 * ne fait que ça, et il est pur : il ne parle ni à la base, ni à l'écran.
 *
 * ## L'échelle : variante → hypothèse → donnée de base
 *
 * Une variante est une valeur qu'on **essaie** : elle n'engage rien, elle se lit.
 * Une hypothèse est une valeur qu'on **assume** en attendant mieux : elle est en
 * mémoire, et le jour où elle change, tout ce qui repose dessus devient suspect.
 * Une donnée de base est une valeur qu'on **sait**.
 *
 * Adopter une variante, c'est donc la faire monter d'un barreau — la porter en
 * hypothèse par une proposition. Jamais directement : rien n'entre en mémoire
 * sans passer par la porte. Ce module s'arrête au premier barreau.
 *
 * ## Les trois rangs, et pourquoi ils ne se mélangent jamais
 *
 * Une nouvelle altitude ne produit pas un seul genre de conséquence :
 *
 * 1. **Recalculé** — un utilitaire déterministe a pu être rejoué avec la
 *    nouvelle entrée. On a une vraie valeur, vérifiable, et son écart.
 * 2. **À revérifier** — quelque chose en dépend, mais on ne sait pas le rejouer
 *    ici : le référentiel est au serveur et prend le questionnaire entier. On le
 *    **nomme**, on ne devine pas sa valeur.
 * 3. **Inchangé** — dit explicitement, parce que « rien n'a bougé là » est une
 *    information : sans elle, on ne sait pas si l'outil a regardé.
 *
 * La faute mortelle serait de présenter le deuxième rang comme le premier. Un
 * chiffre qui a l'air recalculé et qui n'était que propagé, une seule fois, et
 * l'écran ne se croit plus. C'est pourquoi une relecture est refusée dès que
 * l'utilitaire cité n'est pas exactement celui dont on connaît la loi.
 *
 * ## Pourquoi la table départementale ne sort pas du serveur
 *
 * La profondeur hors gel vaut `H = H0 + (altitude − 150) / 4000`, et `H0` vient
 * d'une table départementale qui vit au serveur. On n'a pas besoin d'elle :
 * `H0` étant le même pour les deux lectures, il se simplifie et il reste
 *
 *   H' = H + (altitude' − altitude) / 4000
 *
 * La contrainte en mémoire garde l'altitude sur laquelle elle a été calculée
 * (`payload.inputs.altitude`), et c'est tout ce qu'il faut. Rien de ce qui est
 * au serveur ne descend au navigateur.
 */

import { NATURE, classifyAssertion } from "./assertion-taxonomy.js";
import { DERIVED_CONSTRAINT_KIND, describeReserves, inputsStateOf } from "./derived-constraints.js";
import { RESERVE, RESERVES } from "../utilitaires/reserves.js";
import { describeProvenance, utilitaireByReference } from "../utilitaires/catalogue.js";
import { currentAssertions } from "./project-memory.js";
import { dependancesDeLaMemoire } from "./memoire-raisonnement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que porte la donnée de base qu'on fait varier. Un seul sujet, pour l'instant. */
export const SUJET_ALTITUDE = "Altitude du site";

/**
 * Ce que l'écran reconnaît comme « l'altitude du site ».
 *
 * On accepte plusieurs écritures parce que la donnée a été posée à la main dans
 * les projets existants — « Altitude », « altitude du terrain ». On ne devine
 * rien au-delà : un sujet qui ne contient pas le mot n'est pas une altitude.
 */
function estLAltitude(assertion) {
  if (classifyAssertion(assertion).nature !== NATURE.DONNEE_BASE) return false;
  const sujet = texte(assertion?.payload?.subject) || texte(assertion?.statement);
  return /altitude/i.test(sujet);
}

/**
 * Un nombre lu d'un texte français ou anglais.
 *
 * « 490,03 m », « 490.03 », « 1 200 m » disent tous le même nombre. Rendre `NaN`
 * plutôt que zéro : `Number("")` vaut zéro, et une altitude à zéro se calcule
 * sans broncher jusqu'à une cote de fondation fausse.
 */
export function lireUnNombre(valeur) {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : NaN;
  const brut = texte(valeur)
    .replace(/ | /g, "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.+-]/g, "");
  if (!brut) return NaN;
  const nombre = Number(brut);
  return Number.isFinite(nombre) ? nombre : NaN;
}

/**
 * Une altitude écrite en français : virgule décimale, espace fine des milliers.
 *
 * « 1 200 m » et non « 1200 m ». C'est ce que `lireUnNombre` relit sans broncher,
 * et une variante affichée autrement que le reste de la mémoire se lirait comme
 * un autre genre de valeur.
 */
export function altitudeEnTexte(metres) {
  if (!Number.isFinite(metres)) return "";
  const arrondi = Math.round(metres * 100) / 100;
  const [entiere, decimales] = String(Math.abs(arrondi)).split(".");
  const signe = arrondi < 0 ? "-" : "";
  const groupee = entiere.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${signe}${groupee}${decimales ? `,${decimales}` : ""} m`;
}

/**
 * L'altitude que le projet dit aujourd'hui.
 *
 * `null` quand elle n'est pas en mémoire — et c'est une réponse, pas une panne :
 * on ne peut pas faire varier ce qui n'a jamais été posé.
 */
export function altitudeDeLaMemoire(assertions = []) {
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : []);
  const trouvee = enVigueur.find(estLAltitude);
  if (!trouvee) return null;

  const metres = lireUnNombre(trouvee?.payload?.value);
  return {
    assertion: trouvee,
    sujet: texte(trouvee?.payload?.subject) || SUJET_ALTITUDE,
    valeur: texte(trouvee?.payload?.value),
    metres: Number.isFinite(metres) ? metres : null
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les relectures : ce qu'une altitude nouvelle fait d'une contrainte déjà déduite
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Ce qu'on sait relire, et selon quelle version.
 *
 * La clé est la **référence complète** de l'utilitaire — nom et version. Le jour
 * où une `V2` change la loi, la relecture ne s'applique plus : la contrainte
 * tombe au rang « à revérifier » au lieu d'être recalculée selon une loi qui
 * n'est plus la sienne. C'est exactement la garantie qu'on veut : mieux vaut
 * dire « je ne sais pas » que rendre un chiffre d'après la mauvaise règle.
 */
const RELECTURES = {
  deduction_profondeur_hors_gel_altitude_V1: {
    /**
     * H0 se simplifie entre les deux lectures : la table départementale reste au
     * serveur, et l'écart suffit. Deux décimales, comme l'utilitaire les écrit.
     */
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
  const brute = assertion?.payload?.inputs?.altitude;
  const metres = lireUnNombre(brute);
  return Number.isFinite(metres) ? metres : null;
}

/** Une contrainte du site, déduite, qui a lu l'altitude pour se calculer. */
function litLAltitude(assertion) {
  if (texte(assertion?.kind) !== DERIVED_CONSTRAINT_KIND) return false;
  return altitudeDeLEntree(assertion) !== null;
}

/**
 * Une contrainte relue sous la nouvelle altitude, ou `null` si on ne sait pas.
 *
 * Rendre `null` n'est pas un échec : c'est le refus de recalculer d'après une
 * loi qu'on ne connaît pas, et il fait tomber la contrainte au rang « à
 * revérifier », où elle est nommée sans être devinée.
 */
export function relireLaContrainte(assertion, altitude) {
  const relecture = RELECTURES[texte(assertion?.payload?.utilitaire)];
  if (!relecture) return null;

  const altitudeDepart = altitudeDeLEntree(assertion);
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
    altitudeDepart
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les conséquences
 * ────────────────────────────────────────────────────────────────────────── */

/** L'identité d'une affirmation dans les liens de dépendance. */
const idDe = (assertion) => texte(assertion?.id);

/**
 * Ce qui repose, de proche en proche, sur les affirmations qui ont bougé.
 *
 * Les liens se déduisent des conditions écrites dans les règles — c'est
 * `dependancesDeLaMemoire` qui les rend, et personne ne les déclare à la main.
 * On remonte l'aval jusqu'à ce que plus rien ne s'ajoute.
 */
function cequiEnDecoule(assertions, departs) {
  const liens = dependancesDeLaMemoire(assertions);
  const aval = new Map();

  for (const lien of liens) {
    const socle = texte(lien?.depends_on_assertion_id);
    const cible = texte(lien?.assertion_id);
    if (!socle || !cible) continue;
    if (!aval.has(socle)) aval.set(socle, new Set());
    aval.get(socle).add(cible);
  }

  const atteints = new Set();
  const aVoir = [...departs];

  while (aVoir.length) {
    const courant = aVoir.pop();
    for (const suivant of aval.get(courant) ?? []) {
      if (atteints.has(suivant) || departs.has(suivant)) continue;
      atteints.add(suivant);
      aVoir.push(suivant);
    }
  }

  return atteints;
}

/**
 * Ce que change une altitude, rangé en trois rangs qui ne se mélangent pas.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire telle qu'elle est lue
 * @param {number} options.altitude l'altitude qu'on essaie, en mètres
 * @returns {{ok: boolean, raison?: string, depart?: object, altitude?: number,
 *   recalculees?: object[], aRevoir?: object[], inchangees?: number}}
 */
export function consequencesDeLaVariante({ assertions = [], altitude = NaN } = {}) {
  const toutes = Array.isArray(assertions) ? assertions : [];
  const depart = altitudeDeLaMemoire(toutes);

  if (!depart) {
    return { ok: false, raison: "Ce projet n'a pas d'altitude en mémoire : il n'y a rien à faire varier." };
  }
  if (depart.metres === null) {
    return { ok: false, raison: `L'altitude en mémoire ne se lit pas comme un nombre : « ${depart.valeur} ».` };
  }
  if (!Number.isFinite(altitude)) {
    return { ok: false, raison: "Cette altitude ne se lit pas comme un nombre." };
  }
  if (altitude === depart.metres) {
    return { ok: false, raison: "C'est l'altitude que le projet dit déjà : il n'y a pas de variante." };
  }

  const enVigueur = currentAssertions(toutes);

  const recalculees = [];
  const refusees = [];

  for (const assertion of enVigueur) {
    if (!litLAltitude(assertion)) continue;
    const relue = relireLaContrainte(assertion, altitude);
    if (relue) recalculees.push(relue);
    else refusees.push(assertion);
  }

  // Ce qui a **bougé** propage ; ce qui a été recalculé à l'identique ne propage
  // rien, et c'est la seule raison de recalculer avant de propager. Une valeur
  // qui ne change pas ne rend rien suspect en aval.
  const departs = new Set([
    idDe(depart.assertion),
    ...recalculees.filter((ligne) => ligne.valeurABouge || ligne.reservesOntBouge).map((ligne) => idDe(ligne.assertion)),
    ...refusees.map(idDe)
  ].filter(Boolean));

  const recalculeesIds = new Set(recalculees.map((ligne) => idDe(ligne.assertion)));
  const heritiers = cequiEnDecoule(enVigueur, departs);

  const aRevoir = enVigueur
    .filter((assertion) => {
      const id = idDe(assertion);
      if (!id || id === idDe(depart.assertion)) return false;
      if (recalculeesIds.has(id)) return false;
      return refusees.some((autre) => idDe(autre) === id) || heritiers.has(id);
    })
    .map((assertion) => ({
      assertion,
      sujet: texte(assertion?.payload?.subject) || texte(assertion?.statement),
      valeur: texte(assertion?.payload?.value),
      // Pourquoi elle est là : parce qu'elle lit l'altitude sans qu'on sache la
      // rejouer, ou parce qu'elle repose sur quelque chose qui a bougé.
      motif: litLAltitude(assertion) ? "lit-altitude" : "en-decoule",
      // La provenance dit qui aurait à la refaire. Sans elle, « à revérifier »
      // est une inquiétude sans adresse.
      provenance: texte(assertion?.payload?.utilitaire)
        ? describeProvenance(utilitaireByReference(texte(assertion.payload.utilitaire)))
        : ""
    }));

  const touchees = new Set([
    idDe(depart.assertion),
    ...recalculees.map((ligne) => idDe(ligne.assertion)),
    ...aRevoir.map((ligne) => idDe(ligne.assertion))
  ]);

  return {
    ok: true,
    depart,
    altitude,
    recalculees,
    aRevoir,
    // Compté, jamais listé : « rien n'a bougé là » se dit par un nombre, et une
    // liste de soixante lignes identiques noierait les trois qui comptent.
    inchangees: enVigueur.filter((assertion) => !touchees.has(idDe(assertion))).length,
    // De quand date la mémoire relue. Une variante calculée hier sur une mémoire
    // qui a bougé depuis rend des conséquences fausses avec l'air d'être vraies.
    memoireAu: enVigueur.map((assertion) => texte(assertion?.decided_at)).sort().at(-1) ?? "",
    lues: enVigueur.length
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * La mémoire vue sous la variante
 * ────────────────────────────────────────────────────────────────────────── */

/** Une affirmation réécrite sans toucher à l'originale. Rien d'ici ne s'écrit. */
function substituee(assertion, { valeur, reserves = null, effet }) {
  const payload = { ...(assertion?.payload ?? {}) };
  const sujet = texte(payload.subject) || texte(assertion?.statement);
  payload.value = valeur;
  if (Array.isArray(reserves)) {
    payload.reserves = reserves;
    payload.inputsState = inputsStateOf(reserves);
  }

  return {
    ...assertion,
    statement: sujet ? `${sujet} : ${valeur}` : texte(assertion?.statement),
    detail: Array.isArray(reserves)
      ? [texte(payload.utilitaire) ? describeProvenance(utilitaireByReference(texte(payload.utilitaire))) : "", describeReserves(reserves)]
          .filter(Boolean)
          .join(" — ")
      : assertion?.detail ?? null,
    payload,
    /**
     * La marque de la variante, hors du `payload`.
     *
     * Volontairement en dehors : rien n'écrit une affirmation lue, mais si un
     * jour quelque chose le faisait, la marque ne partirait pas en base avec le
     * reste. Un écran la lit pour dire « ceci n'est pas la mémoire ».
     */
    variante: { effet }
  };
}

/**
 * La mémoire telle qu'elle se lirait sous cette variante.
 *
 * C'est la fonction qui rend le « checkout » gratuit : tous les écrans de la
 * mémoire — la liste, les fichiers, la chaîne du raisonnement, le schéma — sont
 * des fonctions d'une liste d'affirmations. Leur en donner une autre suffit ;
 * il n'y a aucun écran à réécrire, et rien à stocker.
 *
 * Les affirmations remplacées ne sont pas retirées : on rend la même liste, dans
 * le même ordre, avec les objets substitués à leur place. L'histoire reste
 * lisible, et une lecture qui masquerait des lignes mentirait sur le compte.
 */
export function memoireAvecLaVariante(assertions = [], variante = null) {
  const toutes = Array.isArray(assertions) ? assertions : [];
  if (!variante || !Number.isFinite(variante?.altitude)) return toutes;

  const consequences = consequencesDeLaVariante({ assertions: toutes, altitude: variante.altitude });
  if (!consequences.ok) return toutes;

  const remplacements = new Map();

  remplacements.set(
    idDe(consequences.depart.assertion),
    substituee(consequences.depart.assertion, { valeur: altitudeEnTexte(variante.altitude), effet: "variante" })
  );

  for (const ligne of consequences.recalculees) {
    remplacements.set(
      idDe(ligne.assertion),
      substituee(ligne.assertion, { valeur: ligne.apres, reserves: ligne.reservesApres, effet: "recalculee" })
    );
  }

  const aRevoir = new Set(consequences.aRevoir.map((ligne) => idDe(ligne.assertion)));

  return toutes.map((assertion) => {
    const id = idDe(assertion);
    if (remplacements.has(id)) return remplacements.get(id);
    // On ne devine pas leur nouvelle valeur : on les marque, et l'écran dit
    // qu'elles sont à revérifier. Une valeur inventée ici serait indiscernable
    // d'une valeur calculée.
    if (aRevoir.has(id)) return { ...assertion, variante: { effet: "a-revoir" } };
    return assertion;
  });
}

/**
 * Ce qu'on retient d'une variante entre deux écrans.
 *
 * Elle porte l'état de la mémoire au moment du calcul : sans lui, on relirait
 * demain une variante calculée hier en croyant qu'elle vaut encore.
 */
export function variantePourLEcran({ altitude = NaN, consequences = null, par = null, at = "" } = {}) {
  if (!consequences?.ok) return null;

  return {
    sujet: consequences.depart.sujet,
    cleSujet: texte(consequences.depart.assertion?.subject_key),
    depuis: consequences.depart.valeur,
    vers: altitudeEnTexte(altitude),
    altitude,
    altitudeDepart: consequences.depart.metres,
    recalculees: consequences.recalculees.length,
    aRevoir: consequences.aRevoir.length,
    inchangees: consequences.inchangees,
    memoireAu: consequences.memoireAu,
    lues: consequences.lues,
    par: par ?? null,
    calculeeAu: texte(at) || new Date().toISOString()
  };
}

/**
 * La mémoire a-t-elle bougé depuis que la variante a été calculée ?
 *
 * Une variante n'est vraie que de la mémoire sur laquelle elle a été faite. Le
 * jour où une affirmation nouvelle arrive, les conséquences affichées peuvent
 * être fausses — et elles ont exactement le même air qu'avant. On le dit.
 */
export function laMemoireABouge(variante = null, assertions = []) {
  if (!variante) return false;
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : []);
  if (enVigueur.length !== Number(variante.lues)) return true;
  const dernier = enVigueur.map((assertion) => texte(assertion?.decided_at)).sort().at(-1) ?? "";
  return dernier !== texte(variante.memoireAu);
}
