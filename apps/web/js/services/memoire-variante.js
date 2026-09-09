/**
 * Essayer une valeur, et lire ce que le projet en dirait — sans rien écrire.
 *
 * ## Ce que l'étape 6 change
 *
 * La variante ne connaissait qu'un sujet : l'altitude. Elle savait relire deux
 * formules réécrites à la main, et pour tout le reste elle ne rendait que des
 * **noms** — « ceci devient suspect », sans jamais dire ce que ça devenait.
 *
 * Le moteur existe maintenant. Faire varier une valeur, c'est : la substituer,
 * demander au rejeu de refaire le raisonnement, et afficher l'écart. Le sujet
 * n'a plus d'importance — **n'importe quelle valeur du socle** se fait varier,
 * et ce sont les règles du projet qui répondent.
 *
 * Voir `docs/rejouer-la-memoire.md`, étape 6.
 *
 * ## L'échelle : variante → hypothèse → donnée de base
 *
 * Une variante est une valeur qu'on **essaie** : elle n'engage rien, elle se lit.
 * Une hypothèse est une valeur qu'on **assume** en attendant mieux. Une donnée de
 * base est une valeur qu'on **sait**. Adopter une variante, ce sera la faire
 * monter d'un barreau — par une proposition, jamais directement.
 *
 * ## Les utilitaires se rejouent, eux aussi
 *
 * Ce module ne connaît plus **aucune** loi de calcul. Les utilitaires se
 * rejouaient par une table de correspondance écrite à la main, qui portait deux
 * cas ; ils se rejouent maintenant en redemandant à l'outil qui les a produits,
 * en mode « calcule sans écrire ». Voir `utilitaires-rejeu.js`.
 *
 * Le réseau se fait **avant**, une fois, et ce module reçoit le résultat par
 * `relectures`. C'est ce qui le garde pur et synchrone : le calque de la mémoire
 * s'applique des dizaines de fois par rendu, et il ne peut pas attendre.
 *
 * ## Les trois rangs, et pourquoi ils ne se mélangent jamais
 *
 * 1. **Recalculé** — une règle du projet a été rejouée, ou un utilitaire a
 *    recalculé au serveur. Une vraie valeur, et sa trace.
 * 2. **À revérifier** — concerné, mais on ne sait pas le refaire : un utilitaire
 *    injoignable ou sans rejeu, une règle dont une entrée manque, une règle qui a
 *    perdu son objet. On le **nomme**, on ne devine pas.
 * 3. **Inchangé** — compté, et dit. « Rien n'a bougé là » est une information.
 *
 * La faute mortelle serait de présenter le deuxième rang comme le premier.
 *
 * ## Deux rejeux, et c'est leur différence qui compte
 *
 * Une règle qui conclut déjà autre chose que ce que le projet affirme est un
 * **défaut de la mémoire** — l'audit le dit — et non une conséquence de la
 * variante. L'attribuer à la variante ferait porter à celui qui essaie une
 * valeur la dérive de ceux qui l'ont précédé.
 */

import { classifyAssertion } from "./assertion-taxonomy.js";
import { zonesLisibles } from "./memoire-blame.js";
import { versementsEclipses } from "./memoire-valeurs.js";
import { mesureEnFrancais } from "./memoire-en-texte.js";
import { currentAssertions } from "./project-memory.js";
import { describeReserves, inputsStateOf } from "./derived-constraints.js";
import { describeProvenance, utilitaireByReference } from "../utilitaires/catalogue.js";
import { dependancesDeLaMemoire } from "./memoire-raisonnement.js";
import { dependancesDesApplications } from "./memoire-applications.js";
import { rejouerLesRegles } from "./memoire-rejeu.js";
import { natureDuNoeud, sortiesDesRegles, NOEUD } from "./memoire-plan.js";
import { phraseDuRefus } from "./utilitaires-rejeu.js";

const texte = (valeur) => String(valeur ?? "").trim();
const idDe = (assertion) => texte(assertion?.id);

const estUneRegle = (assertion) => assertion?.payload?.referentiel === true;

/**
 * Les valeurs qu'on peut faire varier : le **socle**, et lui seul.
 *
 * On change ce que le projet pose, suppose ou constate — pas ce que ses règles
 * en concluent. Substituer une valeur dérivée reviendrait à réécrire la
 * conclusion sans toucher au raisonnement : l'écran montrerait alors une chaîne
 * qui ne mène plus à ce qu'elle affiche, ce qui est exactement le défaut que
 * l'audit cherche.
 */
/**
 * Ce qu'une valeur est, en une phrase, quand le projet le dit.
 *
 * ## Pourquoi elle manquait
 *
 * « Altitude du site » se comprend seul. « H0 retenu pour le département »,
 * « contrainte limite à l'ELS », « ratio déterminant », non — et la liste des
 * valeurs qu'on peut faire varier en est pleine. On y choisissait au jugé, ou
 * l'on renonçait à chercher.
 *
 * ## D'où elle vient, et d'où elle ne vient pas
 *
 * Quatre sources, toutes **déclarées**, dans l'ordre du plus précis au plus
 * général : ce que l'affirmation dit d'elle-même, à quoi elle sert, le libellé
 * de l'utilitaire qui l'a produite, et la norme dont elle vient. Aucune n'est
 * fabriquée : quand les quatre se taisent, on ne dit rien plutôt que d'écrire
 * une phrase que personne n'a signée.
 */
export function descriptionDeLaValeur(assertion = null) {
  const payload = assertion?.payload ?? {};
  const outil = texte(payload.utilitaire) ? utilitaireByReference(texte(payload.utilitaire)) : null;

  return texte(payload.quoi)
    || texte(payload.utilisation)
    || texte(outil?.libelle)
    || texte(payload.source);
}

/**
 * La déclaration à laquelle lire un tableau : celle de l'utilitaire d'aujourd'hui.
 *
 * ## Pourquoi pas la copie figée
 *
 * L'affirmation porte la `structure` telle qu'elle était **au versement**. Pour
 * une valeur, ce gel est la règle même de Mdall : on rejoue avec la loi de
 * l'époque, jamais avec une copie d'aujourd'hui. Ici, non — et la différence
 * n'est pas un détail.
 *
 * `sens` et `marge` ne sont pas des données : ce sont les **légendes** qui
 * disent comment lire une donnée. « en défaut est un défaut », « ce ratio doit
 * rester sous 1 » ne changent pas ce que le calcul a rendu ; elles changent ce
 * qu'un lecteur en comprend. Les figer voudrait dire qu'un projet versé hier ne
 * profitera jamais d'une légende écrite demain, et qu'il faudrait re-verser des
 * années de mémoire pour gagner une couleur.
 *
 * La copie figée reste le recours : un utilitaire retiré du catalogue laisse ses
 * affirmations lisibles avec ce qu'elles portent. Et la correspondance se fait
 * **par nom de colonne** : une colonne renommée ne trouve rien, donc ne se
 * colore pas — jamais un mauvais rapprochement.
 */
export function structureDuTableau(ligne = null) {
  const outil = utilitaireByReference(texte(ligne?.utilitaire)
    || texte(ligne?.assertion?.payload?.utilitaire));
  const vivante = outil?.rend?.structure;
  if (Array.isArray(vivante) && vivante.length) return vivante;

  const figee = ligne?.assertion?.payload?.structure;
  return Array.isArray(figee) && figee.length ? figee : null;
}

export function valeursSubstituables(assertions = []) {
  // Ce qu'un versement plus récent a refait ne se propose pas : on choisissait
  // deux fois « H0 retenu pour le département, batiment-a » sans savoir laquelle
  // des deux le projet tient pour vraie — et faire varier la morte n'aurait rien
  // changé nulle part.
  const eclipses = versementsEclipses(Array.isArray(assertions) ? assertions : []);
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => !eclipses.has(String(idDe(assertion) ?? "")));
  const produites = new Set(
    enVigueur
      .filter((assertion) => natureDuNoeud(assertion, { produites: sortiesDesRegles(enVigueur) }) === NOEUD.REJOUABLE)
      .map(idDe)
  );

  return enVigueur
    .filter((assertion) => !estUneRegle(assertion))
    .filter((assertion) => !produites.has(idDe(assertion)))
    .filter((assertion) => natureDuNoeud(assertion, { produites }) === NOEUD.SOCLE)
    .filter((assertion) => idDe(assertion) && texte(assertion?.payload?.subject))
    .map((assertion) => ({
      id: idDe(assertion),
      assertion,
      sujet: texte(assertion.payload.subject),
      // La même écriture que la mémoire : « 0.5 m » ici et « 0,5 m » dans le
      // fichier feraient douter qu'il s'agisse de la même valeur.
      valeur: mesureEnFrancais(assertion.payload.value),
      // La portée, sans quoi quatre « Altitude du site » se ressemblent trait
      // pour trait dans la liste : on en choisissait une au hasard sans savoir
      // sur quelle partie de l'ouvrage on était en train de varier.
      zones: zonesLisibles(assertion),
      // Ce qu'elle est, quand le projet le dit. Sans elle, une liste de noms
      // obscurs se choisit au jugé. Voir `descriptionDeLaValeur`.
      quoi: descriptionDeLaValeur(assertion),
      nature: classifyAssertion(assertion).nature
    }));
}

/**
 * Ce qui repose, de proche en proche, sur les affirmations qui ont bougé.
 *
 * Les lectures **enregistrées** priment quand on les a : elles ont été figées au
 * moment où la règle a servi, et elles survivent à un renommage. À défaut, on
 * déduit les liens des conditions écrites dans les règles — c'est ce qu'on
 * faisait avant l'étape 1, et cela reste vrai, en moins sûr.
 */
function cequiEnDecoule(assertions, departs, applications) {
  const liens = Array.isArray(applications) && applications.length
    ? dependancesDesApplications(applications)
    : dependancesDeLaMemoire(assertions);

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

/** Ce qu'un rejeu a conclu, indexé par ce qu'il produit. */
function etatDuRejeu(rejeu) {
  return {
    conclusions: new Map(
      (rejeu?.conclusions ?? [])
        .filter((ligne) => texte(ligne?.sortie?.id))
        .map((ligne) => [texte(ligne.sortie.id), texte(ligne.apres)])
    ),
    sansObjet: new Set(
      (rejeu?.sansObjet ?? []).map((ligne) => texte(ligne?.sortie?.id)).filter(Boolean)
    ),
    indecidables: new Set(
      (rejeu?.indecidables ?? []).map((ligne) => texte(ligne?.sortie?.id)).filter(Boolean)
    )
  };
}

/**
 * Ce que change une variante, rangé en trois rangs qui ne se mélangent pas.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire telle qu'elle est lue
 * @param {Map<string, string>|object} options.substitutions affirmation → valeur essayée
 * @param {object[]} [options.applications] les lectures enregistrées, si on les a
 * @param {{recalculees: object[], refusees: object[]}} [options.relectures] ce que
 *   les utilitaires ont répondu quand on les a rejoués. Calculé avant, par
 *   `rejouerLesUtilitaires` : ce module ne parle à personne.
 */
export function consequencesDeLaVariante({
  assertions = [], substitutions = new Map(), applications = null, relectures = null
} = {}) {
  const toutes = Array.isArray(assertions) ? assertions : [];
  const voulues = substitutions instanceof Map ? substitutions : new Map(Object.entries(substitutions ?? {}));
  const enVigueur = currentAssertions(toutes);

  const substituables = new Map(valeursSubstituables(toutes).map((entree) => [entree.id, entree]));
  const depart = [];

  for (const [id, valeur] of voulues) {
    const entree = substituables.get(texte(id));
    if (!entree) {
      return { ok: false, raison: "Cette valeur ne se fait pas varier : seul le socle du projet se change." };
    }
    if (texte(valeur) === entree.valeur) {
      return { ok: false, raison: `C'est ce que le projet dit déjà de « ${entree.sujet} » : il n'y a pas de variante.` };
    }
    if (!texte(valeur)) {
      return { ok: false, raison: "Une variante a besoin d'une valeur : c'est elle qu'on essaie." };
    }
    depart.push({ ...entree, vers: texte(valeur) });
  }

  if (!depart.length) return { ok: false, raison: "Rien n'a été changé : il n'y a pas de variante." };

  // Ce que les utilitaires ont répondu. Rien n'est calculé ici : le rejeu a eu
  // lieu avant, au serveur, avec la même loi et la même version qu'au versement.
  const recalculees = Array.isArray(relectures?.recalculees) ? relectures.recalculees : [];
  const refusees = Array.isArray(relectures?.refusees) ? relectures.refusees : [];

  // Ce qu'on impose au rejeu : les valeurs essayées, et ce que les relectures
  // viennent d'établir. Le moteur fait le reste.
  const imposees = new Map([
    ...voulues,
    ...recalculees.map((ligne) => [idDe(ligne.assertion), ligne.apres])
  ]);

  const avant = etatDuRejeu(rejouerLesRegles(enVigueur));
  const rejeu = rejouerLesRegles(enVigueur, { substitutions: imposees });

  const rejouees = rejeu.conclusions
    .filter((conclusion) => texte(conclusion?.sortie?.id))
    .filter((conclusion) => avant.conclusions.get(texte(conclusion.sortie.id)) !== texte(conclusion.apres))
    .map((conclusion) => ({
      assertion: conclusion.sortie,
      sujet: conclusion.sujet,
      avant: conclusion.avant,
      apres: conclusion.apres,
      zone: conclusion.zone,
      trace: conclusion.trace
    }));

  // Une règle qui perd son objet ne rend pas de valeur : elle retire le
  // fondement de celle que le projet tient. Ce n'est pas un recalcul.
  const sansFondement = new Map(
    rejeu.sansObjet
      .filter((ligne) => texte(ligne?.sortie?.id))
      .filter((ligne) => !avant.sansObjet.has(texte(ligne.sortie.id)))
      .map((ligne) => [texte(ligne.sortie.id), ligne])
  );

  const changees = new Set([
    ...depart.map((entree) => entree.id),
    ...recalculees.filter((l) => l.valeurABouge || l.reservesOntBouge).map((l) => idDe(l.assertion)),
    ...refusees.map((ligne) => idDe(ligne.assertion)),
    ...rejouees.map((l) => idDe(l.assertion))
  ].filter(Boolean));

  /**
   * Ce que le rejeu a **confirmé** : évalué, et rendu la même valeur qu'avant.
   *
   * Sans ce compte, une règle que le moteur venait de rejouer avec succès tombait
   * dans « à revérifier » du seul fait qu'une de ses entrées avait bougé. C'est
   * exactement le faux signal qu'on refuse ailleurs : on a regardé, la conclusion
   * tient, et le dire suspect apprend à ignorer l'écran.
   */
  const confirmees = (rejeu.tenues ?? [])
    .map((tenue) => texte(tenue?.sortie?.id))
    .filter(Boolean)
    .filter((id) => !rejouees.some((ligne) => idDe(ligne.assertion) === id));

  const traitees = new Set([
    ...depart.map((entree) => entree.id),
    ...recalculees.map((l) => idDe(l.assertion)),
    ...rejouees.map((l) => idDe(l.assertion)),
    ...confirmees
  ]);

  const heritiers = cequiEnDecoule(enVigueur, changees, applications);

  const aRevoir = enVigueur
    .filter((assertion) => {
      const id = idDe(assertion);
      if (!id || traitees.has(id) || estUneRegle(assertion)) return false;
      return sansFondement.has(id)
        || refusees.some((autre) => idDe(autre.assertion) === id)
        || heritiers.has(id);
    })
    .map((assertion) => {
      const id = idDe(assertion);
      return {
        assertion,
        sujet: texte(assertion?.payload?.subject) || texte(assertion?.statement),
        valeur: texte(assertion?.payload?.value),
        motif: sansFondement.has(id)
          ? "sans-objet"
          : refusees.some((autre) => idDe(autre.assertion) === id)
            ? "utilitaire"
            : "en-decoule",
        pourquoi: sansFondement.has(id)
          ? "la règle qui la concluait ne s'applique plus, et elle n'a rien à dire à la place"
          : refusees.some((autre) => idDe(autre.assertion) === id)
            ? phraseDuRefus(refusees.find((autre) => idDe(autre.assertion) === id)?.refus)
            : rejeu.indecidables.some((ligne) => texte(ligne?.sortie?.id) === id)
              ? `sa règle n'a pas pu être évaluée : il manque ${
                  rejeu.indecidables.find((ligne) => texte(ligne?.sortie?.id) === id)?.manquants.join(", ")
                }`
              : "",
        provenance: texte(assertion?.payload?.utilitaire)
          ? describeProvenance(utilitaireByReference(texte(assertion.payload.utilitaire)))
          : ""
      };
    });

  const touchees = new Set([...traitees, ...aRevoir.map((l) => idDe(l.assertion))]);

  return {
    ok: true,
    depart,
    substitutions: voulues,
    // Rendues telles quelles : c'est ce que le calque réappliquera, et ce que la
    // variante gardée entre deux écrans doit porter. Le recalculer ailleurs
    // rappellerait le serveur pour une réponse qu'on a déjà.
    relectures: { recalculees, refusees },
    recalculees,
    rejouees,
    // Comptées, jamais listées : trois cents lignes « rien n'a changé » noieraient
    // les trois qui comptent. Le compte, lui, dit que l'outil a regardé.
    confirmees: confirmees.length,
    cycles: rejeu.cycles,
    aRevoir,
    // Compté, jamais listé : une liste de soixante lignes identiques noierait
    // les trois qui comptent.
    inchangees: enVigueur.filter((assertion) => !touchees.has(idDe(assertion))).length,
    memoireAu: enVigueur.map((assertion) => texte(assertion?.decided_at)).sort().at(-1) ?? "",
    lues: enVigueur.length
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Ce qu'un tableau devient
 * ────────────────────────────────────────────────────────────────────────── */

/** La colonne qui nomme une ligne de tableau. C'est elle qui l'identifie. */
const NOM_DE_LIGNE = "désignation";

/**
 * Les cellules d'une ligne qui se lisent — pas les entrées qu'elle transporte.
 *
 * Une ligne de massif porte, sous `entrées`, les quarante champs qui ont servi
 * au calcul. Les comparer noierait les six cotes qui comptent sous un mur de
 * différences qu'on ne regarde jamais.
 */
function cellulesLisibles(ligne) {
  return Object.entries(ligne ?? {}).filter(([, valeur]) => valeur === null || typeof valeur !== "object");
}

/**
 * Ce qu'une variante change dans un tableau, ligne à ligne.
 *
 * Une fonction native ne rend pas une valeur mais **un tableau** — douze massifs,
 * leurs cotes, leur verdict. La phrase qui le résume ne suffit pas à juger : « 12
 * vérifiées » avant et après peut recouvrir douze arases qui ont toutes bougé.
 * C'est précisément ce qu'on n'arrivait pas à voir, et donc pas à croire.
 *
 * L'appariement se fait par la **désignation** quand elle existe : un massif
 * ajouté ou retiré décalerait tout le reste si l'on comparait par rang. Le rang
 * ne sert que de recours, quand une ligne n'a pas de nom.
 *
 * @returns {{nom: string, cellules: {colonne: string, avant: string, apres: string}[], connue: boolean}[]}
 */
export function differencesDuTableau(avant = [], apres = []) {
  const anciennes = new Map();
  const passees = Array.isArray(avant) ? avant : [];
  passees.forEach((ligne, rang) => anciennes.set(texte(ligne?.[NOM_DE_LIGNE]) || `#${rang}`, ligne));

  return (Array.isArray(apres) ? apres : []).map((ligne, rang) => {
    const nomme = texte(ligne?.[NOM_DE_LIGNE]);
    const nom = nomme || `#${rang}`;
    // Le rang ne sert de recours que pour une ligne **sans nom**. Une ligne
    // nommée qu'on ne retrouve pas est une ligne nouvelle : l'apparier au rang
    // la comparerait à un autre massif, et rendrait douze différences fausses.
    const ancienne = anciennes.get(nom) ?? (nomme ? null : passees[rang]) ?? null;

    return {
      nom,
      // Une ligne sans passé n'a pas de différence à montrer : elle est neuve, et
      // la dire « changée » ferait chercher un avant qui n'existe pas.
      connue: Boolean(ancienne),
      cellules: cellulesLisibles(ligne)
        .filter(([colonne]) => colonne !== NOM_DE_LIGNE)
        .filter(([colonne, valeur]) => Boolean(ancienne) && texte(ancienne[colonne]) !== texte(valeur))
        .map(([colonne, valeur]) => ({ colonne, avant: texte(ancienne[colonne]), apres: texte(valeur) }))
    };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * La mémoire vue sous la variante
 * ────────────────────────────────────────────────────────────────────────── */

/** Une affirmation réécrite sans toucher à l'originale. Rien d'ici ne s'écrit. */
function substituee(assertion, { valeur, reserves = null, effet, avant = "", pourquoi = "", tableau = null }) {
  const payload = { ...(assertion?.payload ?? {}) };
  const sujet = texte(payload.subject) || texte(assertion?.statement);
  payload.value = valeur;
  if (Array.isArray(reserves)) {
    payload.reserves = reserves;
    payload.inputsState = inputsStateOf(reserves);
  }

  // **Le tableau suit la phrase.** Sans cela, lire la mémoire avec la variante
  // montrait la phrase refaite — « 8 vérifiées, 4 en défaut » — au-dessus du
  // tableau d'avant, où les douze massifs étaient encore verts et posés à leur
  // ancienne arase. La ligne disait qu'il y avait des défauts, et le détail
  // qu'il n'y en avait aucun : c'est le pire des deux, parce qu'on croit le
  // détail. Le tableau est ce que l'utilitaire vient de rendre, il vient avec.
  if (Array.isArray(tableau)) payload.tableau = tableau;

  return {
    ...assertion,
    statement: sujet ? `${sujet} : ${valeur}` : texte(assertion?.statement),
    detail: Array.isArray(reserves)
      ? [
          texte(payload.utilitaire) ? describeProvenance(utilitaireByReference(texte(payload.utilitaire))) : "",
          describeReserves(reserves)
        ].filter(Boolean).join(" — ")
      : assertion?.detail ?? null,
    payload,
    /**
     * La marque de la variante, **hors** du `payload`.
     *
     * Volontairement en dehors : rien n'écrit une affirmation lue, mais si un
     * jour quelque chose le faisait, la marque ne partirait pas en base avec le
     * reste. Un écran la lit pour dire « ceci n'est pas la mémoire ».
     */
    variante: {
      effet,
      avant: texte(avant) || texte(assertion?.payload?.value),
      pourquoi: texte(pourquoi)
    }
  };
}

/**
 * La mémoire telle qu'elle se lirait sous cette variante.
 *
 * C'est ce qui rend le « checkout » gratuit : tous les écrans de la mémoire sont
 * des fonctions d'une liste d'affirmations. Leur en donner une autre suffit.
 *
 * Les affirmations remplacées ne sont pas retirées : on rend la même liste, dans
 * le même ordre, avec les objets substitués à leur place. Une lecture qui
 * masquerait des lignes mentirait sur le compte.
 */
export function memoireAvecLaVariante(assertions = [], variante = null) {
  const toutes = Array.isArray(assertions) ? assertions : [];
  const voulues = variante?.substitutions instanceof Map
    ? variante.substitutions
    : new Map(Object.entries(variante?.substitutions ?? {}));
  if (!voulues.size) return toutes;

  const consequences = consequencesDeLaVariante({
    assertions: toutes, substitutions: voulues, relectures: variante?.relectures ?? null
  });
  if (!consequences.ok) return toutes;

  const remplacements = new Map();

  for (const entree of consequences.depart) {
    remplacements.set(entree.id, substituee(entree.assertion, {
      valeur: entree.vers, effet: "variante", avant: entree.valeur
    }));
  }

  for (const ligne of consequences.recalculees) {
    remplacements.set(idDe(ligne.assertion), substituee(ligne.assertion, {
      valeur: ligne.apres,
      reserves: ligne.reservesApres,
      // Ce que l'utilitaire vient de rendre, ligne à ligne. Voir `substituee`.
      tableau: Array.isArray(ligne.tableau) ? ligne.tableau : null,
      effet: ligne.valeurABouge || ligne.reservesOntBouge ? "recalculee" : "relue",
      avant: ligne.avant,
      // « recalculée » quand elle a bougé, « relue » quand elle n'a pas bougé :
      // le mot suit l'effet. Écrire « recalculée » sur une valeur identique
      // ferait chercher un changement qui n'existe pas.
      pourquoi: ligne.utilitaire
        ? `${ligne.valeurABouge || ligne.reservesOntBouge ? "recalculée" : "relue"} par ${ligne.utilitaire}, au serveur`
        : ""
    }));
  }

  for (const ligne of consequences.rejouees) {
    remplacements.set(idDe(ligne.assertion), substituee(ligne.assertion, {
      valeur: ligne.apres, effet: "rejouee", avant: ligne.avant,
      pourquoi: `règle rejouée${ligne.zone ? ` — ${ligne.zone}` : ""}`
    }));
  }

  const raisons = new Map(consequences.aRevoir.map((ligne) => [idDe(ligne.assertion), ligne.pourquoi]));

  return toutes.map((assertion) => {
    const id = idDe(assertion);
    if (remplacements.has(id)) return remplacements.get(id);
    // On ne devine pas leur nouvelle valeur : on les marque, et l'écran dit
    // qu'elles sont à revérifier. Une valeur inventée ici serait indiscernable
    // d'une valeur calculée.
    if (raisons.has(id)) {
      return { ...assertion, variante: { effet: "a-revoir", avant: texte(assertion?.payload?.value), pourquoi: raisons.get(id) } };
    }
    return assertion;
  });
}

/**
 * Ce qui a bougé, colonne par colonne plutôt que ligne par ligne.
 *
 * Douze massifs qui descendent tous de six centimètres, ce n'est pas douze
 * informations : c'en est une, et l'écrire douze fois noie les deux lignes qui
 * font autre chose. Une colonne dont le changement est **le même partout** se
 * dit donc une fois, avec le nombre de lignes qu'elle emporte ; une colonne qui
 * varie d'une ligne à l'autre se laisse lire ligne à ligne.
 *
 * @param {{cellules: {colonne: string, avant: string, apres: string}[]}[]} differences
 * @returns {{colonne: string, lignes: number, avant: string, apres: string, uniforme: boolean}[]}
 */
export function resumeParColonne(differences = []) {
  const colonnes = new Map();

  for (const entree of Array.isArray(differences) ? differences : []) {
    for (const cellule of entree?.cellules ?? []) {
      const vue = colonnes.get(cellule.colonne) ?? { colonne: cellule.colonne, lignes: 0, valeurs: new Set() };
      vue.lignes += 1;
      vue.valeurs.add(`${cellule.avant}\u0000${cellule.apres}`);
      if (vue.lignes === 1) { vue.avant = cellule.avant; vue.apres = cellule.apres; }
      colonnes.set(cellule.colonne, vue);
    }
  }

  return [...colonnes.values()].map((vue) => ({
    colonne: vue.colonne,
    lignes: vue.lignes,
    avant: vue.avant ?? "",
    apres: vue.apres ?? "",
    // Une seule paire avant/après pour toute la colonne : le changement est le
    // même partout, et se dit une fois. Deux paires, et il faut les montrer.
    uniforme: vue.valeurs.size === 1
  }));
}

/**
 * Ce qu'on retient d'une variante entre deux écrans.
 *
 * Elle porte l'état de la mémoire au moment du calcul : sans lui, on relirait
 * demain une variante calculée hier en croyant qu'elle vaut encore.
 */
export function variantePourLEcran({ consequences = null, par = null, at = "" } = {}) {
  if (!consequences?.ok) return null;

  return {
    substitutions: consequences.substitutions,
    // Ce que les utilitaires ont répondu, gardé avec la variante : le calque le
    // réapplique sans redemander, et sans rien recalculer de son côté.
    relectures: consequences.relectures,
    depart: consequences.depart.map((entree) => ({
      sujet: entree.sujet, depuis: entree.valeur, vers: entree.vers
    })),
    recalculees: consequences.recalculees.length + consequences.rejouees.length,
    confirmees: consequences.confirmees,
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
 * Une variante n'est vraie que de la mémoire sur laquelle elle a été faite, et
 * une variante périmée a exactement le même air qu'une variante fraîche.
 */
export function laMemoireABouge(variante = null, assertions = []) {
  if (!variante) return false;
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : []);
  if (enVigueur.length !== Number(variante.lues)) return true;
  const dernier = enVigueur.map((assertion) => texte(assertion?.decided_at)).sort().at(-1) ?? "";
  return dernier !== texte(variante.memoireAu);
}
