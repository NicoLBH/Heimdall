/**
 * La mémoire du projet, écrite — et relue.
 *
 * ## Le sens de la flèche a changé
 *
 * Ce fichier écrivait, et rien d'autre : `mémoire → texte`, jamais l'inverse.
 * C'était prudent et c'est devenu faux. Un architecte doit pouvoir écrire une
 * ligne à la main et l'injecter ; un utilitaire de l'Atelier ne fait finalement
 * rien d'autre qu'écrire du mdall. Les deux sens comptent :
 *
 * ```
 * mémoire  →  texte     ici, dans ce fichier
 * texte    →  mémoire   dans `memoire-en-lecture.js`
 * ```
 *
 * Et une seule loi les relie, vérifiée par un test : **lire(écrire(G)) = G**.
 * Chaque information du graphe apparaît une fois dans le texte, et rien de
 * déductible n'y apparaît. C'est cette réciprocité qui fait du texte la
 * mémoire, et non une vue de la mémoire.
 *
 * ## Les cinq objets, et pourquoi ils ne se mélangent plus
 *
 * La v2 écrivait tout sur un bloc unique, et mélangeait :
 *
 * | l'objet | ce qu'il est | où il vit maintenant |
 * | --- | --- | --- |
 * | la donnée | « Hauteur du plancher bas… » | le sujet, en tête de ligne |
 * | la valeur | « 26 m » | après le `=` |
 * | la règle | `si … alors …` | un fichier de référentiel, réutilisable |
 * | la preuve | l'article, puis sa citation | `←` puis `parce que` |
 * | le statut | « retenu », « supposé » | `statut`, sur sa ligne |
 *
 * La conséquence la plus lourde : **la règle quitte le fichier de projet**. Une
 * règle vaut pour mille projets, une valeur pour un seul. Les garder ensemble
 * produisait des « règles » du genre `si hauteur = 26`, vraies d'un bâtiment et
 * d'aucun autre, qui ne capitalisaient rien et faisaient mentir le diff dans
 * les deux sens.
 *
 * ## Ce qui a disparu, et pourquoi
 *
 * - **`dépend de`** — la dépendance se déduit des conditions de la règle.
 *   L'écrire une seconde fois, c'est la laisser diverger le jour où quelqu'un
 *   modifie la règle sans y penser (fondamentaux, règle 4).
 * - **`✓ retenu` sur la ligne `alors`** — mélangeait la conséquence de la règle
 *   et l'état du raisonnement dans **ce** projet. Le second est `statut`.
 * - **`⇐ calcul(…)`** — un calcul est une provenance comme une autre :
 *   `← calcul`.
 * - **`on retient` / `on suppose`** — un geste n'est pas un préfixe, c'est une
 *   provenance : `← décision`, `← hypothèse`.
 *
 * ## L'identité de l'écriture, et pourquoi elle a bougé
 *
 * Ce fichier a longtemps refusé les marques de programmeur : rien de `const`,
 * de `function` ni de `//`, au motif qu'elles annonceraient un programme là où
 * il n'y a qu'un raisonnement transcrit.
 *
 * Cela tenait tant que la mémoire ne faisait que **se lire**. Un `.ref` ne se
 * lit pas : il s'**exécute**. Ses conditions se composent, sa conclusion se
 * pose, et le jour où on l'écrira à la main il faudra savoir, sans ambiguïté,
 * où une clause commence et où une instruction finit. Trois conditions
 * enchaînées sans parenthèses ne se relisent déjà pas ; elles ne se parseraient
 * pas du tout.
 *
 * Les fichiers de règles portent donc, **et eux seuls**, la ponctuation qui les
 * rend exécutables : `fonction`, les parenthèses de chaque clause, le
 * point-virgule qui termine ce que la règle pose. Ce ne sont pas des mots de
 * programmeur empruntés pour faire sérieux : ce sont les bornes sans lesquelles
 * un raisonnement composé ne se relit pas.
 *
 * Les autres fichiers ne bougent pas. Un `.ctr` énonce des paires, un `.ddb`
 * déclare : ni l'un ni l'autre n'a de clause à borner, et leur mettre des
 * parenthèses ne dirait rien de plus.
 *
 * ## Tout se tape au clavier
 *
 * `§`, `¶`, `←`, `≤`, `≥`, `≠` étaient jolis et intapables. Un langage qu'un
 * architecte doit pouvoir écrire à la main ne peut pas exiger une table de
 * caractères : chaque marque est remplacée par un **mot suivi de deux points**,
 * qui dit en plus ce qu'elle voulait dire.
 *
 * | ligne | ce qu'elle dit |
 * | --- | --- |
 * | `fichier:` | le chemin du fichier |
 * | `note:` | une note sur le fichier lui-même |
 * | `=` | ce que la donnée vaut |
 * | `texte: · document: · calcul: · règle: · décision: · hypothèse:` | d'où cela vient |
 * | `si · et · ou · non · alors · sinon · sauf si` | la règle, dans les mots de l'arrêté |
 * | `parce que:` | la preuve, citée entre guillemets |
 * | `statut:` | l'état du raisonnement dans ce projet |
 * | `le:` | la date d'un constat |
 *
 * La provenance n'a plus de flèche **ni** de type derrière : le mot-clé **est**
 * le type. Une ligne de moins à comprendre, et une de moins à écrire.
 *
 * ## Une règle se lit comme une fonction
 *
 * ```
 * fonction Classement du bâtiment(Habitation individuelle ou collective, Nombre d'étages) {
 *    si (Habitation individuelle ou collective = "collective")
 *    et (Nombre d'étages <= 3)
 *    alors ("2e famille");
 * }
 * ```
 *
 * La parenthèse nomme les **entrées**, et c'est ce qui manquait le plus : on
 * voit d'un coup d'œil de quoi la règle a besoin, sans lire ses conditions. Ce
 * n'est pas une concession à l'informatique — un article d'arrêté commence lui
 * aussi par dire de quoi il parle.
 *
 * Elle ne se stocke pas : les entrées **sont** les sujets des conditions. Une
 * signature recopiée diverge le jour où quelqu'un ajoute une condition.
 *
 * ## La portée est le dossier, plus une marque sur la ligne
 *
 * `@ escalier B` a disparu. Les fichiers se rangent par zone — `escalier-b/
 * incendie.ctr` — et une marque de portée en plus dirait deux fois la même
 * chose. Une affirmation qui vaut pour deux zones apparaît dans les deux
 * fichiers : c'est la même, vue de deux endroits.
 *
 * ## Trois lois de lecture
 *
 * 1. **L'indentation est l'appartenance.** Une ligne indentée détaille la ligne
 *    pleine qui la précède. Trois espaces, jamais une tabulation : sa largeur
 *    dépend de qui la lit, et une mémoire qui se lit différemment selon l'écran
 *    n'est pas une mémoire.
 * 2. **Un mot-clé ne compte qu'en tête de ligne**, après le retrait. « Habitation
 *    individuelle **ou** collective » est un sujet, pas une disjonction.
 * 3. **Une valeur textuelle porte des guillemets, une valeur mesurée n'en porte
 *    pas.** `= "3e famille B"` contre `= 26 m`. La lecture accepte les deux
 *    formes de guillemets, droits et français : personne ne doit être refusé
 *    pour une raison typographique.
 *
 * ## Ce qu'on n'aligne pas avec des espaces
 *
 * L'écriture ne remplit jamais une colonne de blancs pour aligner les valeurs.
 * Le jour où quelqu'un dépose une affirmation au sujet plus long que les
 * autres, **toutes** les lignes du fichier changeraient d'un espace, et le diff
 * annoncerait douze modifications pour un ajout.
 *
 * ## L'écriture porte sa version
 *
 * Le texte étant engendré, changer ce fichier change toutes les lignes de tous
 * les fichiers. La version est donc écrite dans l'en-tête : un changement de
 * rendu s'annonce comme tel, « la façon d'écrire a changé, pas ce qui est
 * écrit ».
 */

/**
 * La version de l'écriture. Elle change quand la façon d'écrire change.
 *
 * v4.0 — tout se tape au clavier : les marques `§`, `¶`, `←`, `≤` deviennent
 * des mots suivis de deux points. Une règle porte sa signature. Chaque nature
 * a sa forme et son extension, et la portée est le dossier.
 *
 * v4.1 — un `.ref` s'écrit comme il s'exécute : `fonction` ouvre la règle, ses
 * entrées sont ses paramètres, chaque clause porte ses parenthèses et ce qu'elle
 * pose se termine par un point-virgule. Les autres fichiers ne changent pas.
 */
export const ECRITURE = "4.1";

/** Le pas d'indentation. Trois espaces, jamais une tabulation. */
export const RETRAIT = "   ";

/** Ce qu'un morceau de ligne est, pour qui le colore. */
export const JETON = {
  /** `fichier:` — le mot qui ouvre l'en-tête. */
  MOT_FICHIER: "mot-fichier",
  /** Le chemin du fichier, derrière `fichier:`. */
  SECTION: "section",
  /** `note:` et ce qui suit — une remarque sur le fichier, jamais interprétée. */
  NOTE: "note",
  /** Le sujet d'une donnée : « Hauteur du plancher bas du logement le plus haut ». */
  SUJET: "sujet",
  /** Ce qu'elle vaut : « 26 », « 3e famille B ». */
  VALEUR: "valeur",
  /** Son unité, colorée à part : « m », « h », « dm² ». */
  UNITE: "unite",
  /** `=`, `≤`, `≥`, `<`, `>`, `≠` — la comparaison, ou l'affectation. */
  OPERATEUR: "operateur",
  /** `si`, `et`, `ou`, `non`, `alors`, `sinon` — les mots de la règle. */
  MOT_CONDITION: "mot-condition",
  /** `sauf si` — le mot qui borne la règle. */
  MOT_EXCEPTION: "mot-exception",
  /** `parce que` — le mot qui introduit la preuve. */
  MOT_RAISON: "mot-raison",
  /** La preuve elle-même, citée. */
  RAISON: "raison",
  /** `texte:`, `document:`, `calcul:`… — le mot-clé **est** le type. */
  PROVENANCE: "provenance",
  /** Ce qui est désigné derrière le type : « arrêté …, article 6 ». */
  SOURCE: "source",
  /** `statut:` — le mot. */
  MOT_STATUT: "mot-statut",
  /** Son contenu : retenu, supposé, contesté, remplacé, écarté. */
  STATUT: "statut",
  /** `le:` — le mot qui ouvre la date d'un constat. */
  MOT_DATE: "mot-date",
  /** La date elle-même. */
  DATE: "date",
  /** Les entrées d'une règle, entre parenthèses. */
  ENTREES: "entrees",
  /** `fonction` — le mot qui ouvre une règle. */
  MOT_FONCTION: "mot-fonction",
  /** Un paramètre de la règle : une entrée, nommée. */
  PARAMETRE: "parametre",
  /** `(`, `)`, `,`, `;` — ce qui borne et sépare, sans rien dire. */
  PONCTUATION: "ponctuation",
  /** `{` et `}` — les bornes d'un bloc. */
  ACCOLADE: "accolade",
  /** `zone:` — le mot qui ouvre une section de portée. */
  MOT_ZONE: "mot-zone",
  /** Le nom de la zone. */
  ZONE: "zone",
  /** Ce qui ne se colore pas : les espaces, les séparateurs. */
  NEUTRE: "neutre"
};

/**
 * D'où une valeur vient. Six réponses, et pas une de plus.
 *
 * ## Pourquoi la provenance n'est pas une « origine » déclarée
 *
 * On pourrait écrire `origine "règle"` à côté de `← règle …`. Ce serait la même
 * information deux fois. Le **type de la provenance est l'origine** : une ligne
 * qui renvoie à une règle est déduite, une ligne qui renvoie à un plan est lue,
 * une ligne qui renvoie à un calcul est calculée. Rien à déclarer.
 *
 * Les deux dernières sont les seules qui ne se déduisent de rien d'autre :
 * un choix humain, et une supposition. Ce sont donc les seules qu'il faut
 * écrire — et les seules qui engagent quelqu'un.
 */
export const PROVENANCE = {
  /** Un texte réglementaire, une norme, un DTU. */
  TEXTE: "texte",
  /** Une pièce du projet : plan, note, compte rendu. */
  DOCUMENT: "document",
  /** Un calcul, avec ce qu'il a lu. */
  CALCUL: "calcul",
  /** Une règle d'un référentiel — la valeur en est déduite. */
  REGLE: "règle",
  /** Quelqu'un a tranché. */
  DECISION: "décision",
  /** On suppose, en attendant mieux. */
  HYPOTHESE: "hypothèse"
};

/** Les six types, pour qui veut vérifier qu'il en écrit un vrai. */
export const PROVENANCES = Object.values(PROVENANCE);

/**
 * L'état d'un raisonnement dans **ce** projet.
 *
 * Ce n'est pas une propriété de la valeur, ni de la règle : c'est ce que le
 * projet en fait aujourd'hui. La même règle donne « retenu » ici et « contesté »
 * là, sans que rien ne change dans le référentiel.
 */
export const STATUT = {
  /** Le projet le tient pour acquis. */
  RETENU: "retenu",
  /** En attendant mieux. Ce qui en dépend devient suspect si cela change. */
  SUPPOSE: "supposé",
  /** Quelqu'un ne l'admet pas. La valeur reste, le désaccord aussi. */
  CONTESTE: "contesté",
  /** Une décision plus récente a pris sa place. */
  REMPLACE: "remplacé",
  /** Refusé en revue. Un refus est une information, pas une valeur du projet. */
  ECARTE: "écarté",
  /**
   * Examiné, et rien n'est exigé.
   *
   * Ce n'est pas une absence : c'est une conclusion, et c'est celle qu'on
   * cherchera le jour où quelqu'un demandera « et pour la circulation
   * horizontale ? ». La ligne s'écrit, avec sa valeur quand il y en a une —
   * une donnée sans exigence reste une donnée dont d'autres règles dépendent.
   */
  SANS_OBJET: "sans objet",
  /**
   * Il manque une réponse.
   *
   * Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien : la ligne
   * s'écrit, et `parce que` dit ce qui la retient.
   */
  EN_ATTENTE: "en attente"
};

export const STATUTS = Object.values(STATUT);

/**
 * Les comparateurs, dans les signes qu'on lit.
 *
 * `<=` plutôt que `≤` : le second est plus joli et ne se tape pas. Un langage
 * qu'un architecte doit pouvoir écrire à la main ne peut pas exiger une table
 * de caractères. La lecture accepte les deux.
 */
export const OPERATEUR = {
  EGAL: "=",
  DIFFERENT: "!=",
  AU_PLUS: "<=",
  AU_MOINS: ">=",
  MOINS_DE: "<",
  PLUS_DE: ">",
  PARMI: "parmi",
  RENSEIGNE: "renseigné",
  NON_RENSEIGNE: "non renseigné"
};

export const OPERATEURS = Object.values(OPERATEUR);

/**
 * Les mots de la langue, et l'ordre dans lequel on les cherche.
 *
 * « sauf si » avant « si », sans quoi « sauf si » se lirait comme « sauf » suivi
 * d'un sujet nommé « si ». C'est la seule subtilité de la grammaire, et elle
 * tient dans cet ordre.
 */
export const MOTS = [
  "sauf si", "parce que", "statut", "fichier", "note", "le", "zone",
  // `fonction` ouvre une règle, et c'est le seul mot emprunté à un langage de
  // programmation. Il l'est parce qu'un `.ref` en est un : il s'exécute. Voir
  // l'en-tête, « L'identité de l'écriture, et pourquoi elle a bougé ».
  "fonction",
  "si", "et", "ou", "non", "alors", "sinon",
  ...Object.values(PROVENANCE)
];

/** La zone de ce qui vaut partout. Le premier bloc d'un fichier, toujours. */
export const TOUTES_ZONES = "Toutes zones";

const texte = (valeur) => String(valeur ?? "").trim();
const jeton = (type, contenu) => ({ type, texte: contenu });
const espace = (largeur = " ") => jeton(JETON.NEUTRE, largeur);

/**
 * Ce qui, dans une valeur, est le nombre et ce qui est l'unité.
 *
 * « 490,03 m » se coupe, « CF 1/2 h » ne se coupe pas — c'est un degré, pas une
 * mesure, et le couper produirait « CF » suivi de « 1/2 h ». La coupe n'a lieu
 * que si tout ce qui précède l'espace est un nombre.
 */
export function couperLUnite(valeur) {
  const brut = texte(valeur);
  const trouve = brut.match(/^(-?[\d]+(?:[.,\s]\d+)*)\s+(.+)$/);
  if (!trouve) return { nombre: brut, unite: "" };
  return { nombre: trouve[1], unite: trouve[2] };
}

/**
 * Une valeur est-elle mesurée, ou textuelle ?
 *
 * Une mesure s'écrit nue — `= 26 m` —, un texte entre guillemets —
 * `= "3e famille B"`. Sans cette différence, on ne saurait pas relire `= 3` :
 * trois quoi, ou la chaîne « 3 » ? La question se pose vraiment : la famille
 * d'un bâtiment est la catégorie « 3 », pas le nombre trois.
 */
export function estMesuree(valeur) {
  const { nombre } = couperLUnite(valeur);
  return /^-?\d+(?:[.,\s]\d+)*$/.test(texte(nombre));
}

/** Une valeur, écrite selon qu'elle se mesure ou se cite. */
function jetonsDeValeur(valeur, unite = "") {
  const brut = texte(valeur);
  if (!brut) return [];

  const uniteDite = texte(unite);
  if (uniteDite) return [jeton(JETON.VALEUR, brut), espace(), jeton(JETON.UNITE, uniteDite)];

  if (estMesuree(brut)) {
    const coupe = couperLUnite(brut);
    return coupe.unite
      ? [jeton(JETON.VALEUR, coupe.nombre), espace(), jeton(JETON.UNITE, coupe.unite)]
      : [jeton(JETON.VALEUR, coupe.nombre)];
  }

  return [jeton(JETON.VALEUR, `"${brut}"`)];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les lignes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Une donnée et ce qu'elle vaut : la ligne de tête d'un bloc.
 *
 * `Sujet = valeur`, et rien d'autre. La provenance, la preuve et le statut sont
 * des lignes indentées dessous, parce que ce sont des objets différents. La
 * portée n'y est plus : c'est le dossier qui la porte.
 */
export function ligneDAffirmation({ sujet = "", valeur = "", unite = "" } = {}) {
  const jetons = [jeton(JETON.SUJET, texte(sujet))];

  const dit = texte(valeur);
  if (dit) {
    jetons.push(espace(), jeton(JETON.OPERATEUR, OPERATEUR.EGAL), espace());
    jetons.push(...jetonsDeValeur(dit, unite));
  }

  return jetons;
}

/**
 * La tête d'une **règle** : la donnée, et ses entrées entre parenthèses.
 *
 * ```
 * Classement du bâtiment (Habitation individuelle ou collective, Nombre d'étages)
 * ```
 *
 * La signature ne se stocke pas : les entrées **sont** les sujets des
 * conditions, et une signature recopiée diverge le jour où quelqu'un ajoute une
 * condition. Elle se calcule ici, à l'écriture.
 */
export function ligneDeDonnee(sujet = "", entrees = [], { regle = false } = {}) {
  const jetons = regle
    ? [jeton(JETON.MOT_FONCTION, "fonction"), espace(), jeton(JETON.SUJET, texte(sujet))]
    : [jeton(JETON.SUJET, texte(sujet))];

  const noms = [...new Set((Array.isArray(entrees) ? entrees : [entrees]).map(texte).filter(Boolean))];

  // Une règle porte toujours sa parenthèse, même vide : `Colonne sèche()` se
  // lit comme une fonction sans entrée, `Colonne sèche` comme un nom. La
  // différence compte le jour où l'on écrira ces fichiers à la main.
  if (regle) {
    jetons.push(jeton(JETON.PONCTUATION, "("));
    noms.forEach((nom, rang) => {
      if (rang > 0) jetons.push(jeton(JETON.PONCTUATION, ","), espace());
      jetons.push(jeton(JETON.PARAMETRE, nom));
    });
    jetons.push(jeton(JETON.PONCTUATION, ")"));
    return jetons;
  }

  if (noms.length) {
    jetons.push(espace(), jeton(JETON.ENTREES, `(${noms.join(", ")})`));
  }

  return jetons;
}

/**
 * Une condition : `si Sujet <= 28 m`, `et Voie-engins parmi "a" ou "b"`.
 *
 * @param {string} mot `si`, `et`, `ou`, `non`, `sauf si`
 * @param {object} condition `{sujet, operateur, valeur, unite, logique}`
 */
export function ligneDeCondition(mot, condition = {}, profondeur = 1, { regle = false } = {}) {
  const cle = texte(mot);
  const jetons = [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(cle === "sauf si" ? JETON.MOT_EXCEPTION : JETON.MOT_CONDITION, cle),
    espace()
  ];

  // Dans une règle, chaque clause porte ses propres parenthèses : `si (…)`,
  // `et (…)`. Une seule parenthèse ouverte sur la première condition et fermée
  // sur la dernière ferait bouger deux lignes dès qu'on en ajoute une, et le
  // diff ne dirait plus « une condition de plus ».
  if (regle) jetons.push(jeton(JETON.PONCTUATION, "("));
  jetons.push(jeton(JETON.SUJET, texte(condition.sujet)));

  const fermer = () => { if (regle) jetons.push(jeton(JETON.PONCTUATION, ")")); };

  const operateur = texte(condition.operateur) || OPERATEUR.EGAL;
  // « renseigné » se suffit : il ne compare rien, il constate qu'on a répondu.
  if (operateur === OPERATEUR.RENSEIGNE || operateur === OPERATEUR.NON_RENSEIGNE) {
    jetons.push(espace(), jeton(JETON.OPERATEUR, operateur));
    fermer();
    return jetons;
  }

  jetons.push(espace(), jeton(JETON.OPERATEUR, operateur), espace());

  const valeurs = Array.isArray(condition.valeur) ? condition.valeur : [condition.valeur];
  // Une liste se sépare d'un « ou » : c'est ce que « parmi » veut dire, et le
  // lecteur ne doit pas avoir à le deviner d'une virgule.
  valeurs.map(texte).filter(Boolean).forEach((valeur, rang) => {
    if (rang > 0) jetons.push(espace(), jeton(JETON.MOT_CONDITION, "ou"), espace());
    // Un oui/non n'est pas un texte : il ne prend pas de guillemets.
    jetons.push(...(condition.logique === true
      ? [jeton(JETON.VALEUR, valeur)]
      : jetonsDeValeur(valeur, condition.unite)));
  });

  fermer();
  return jetons;
}

/** `alors …` ou `sinon …` — ce que la règle pose. */
export function ligneDeConsequence(mot, valeur = "", unite = "", profondeur = 1, { regle = false } = {}) {
  const jetons = [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_CONDITION, texte(mot)),
    espace()
  ];

  // `alors ("3e famille B");` — ce qui **conclut** est une instruction, et une
  // instruction se termine. C'est ce qui dit, à la lecture comme à la relecture
  // par une machine, où s'arrête ce que la règle pose.
  if (regle) jetons.push(jeton(JETON.PONCTUATION, "("));
  jetons.push(...jetonsDeValeur(valeur, unite));
  if (regle) jetons.push(jeton(JETON.PONCTUATION, ")"), jeton(JETON.PONCTUATION, ";"));

  return jetons;
}

/**
 * `texte: arrêté du 31 janvier 1986 modifié, article 6`
 *
 * Le mot-clé **est** le type, et le type **est** l'origine de la valeur : une
 * ligne qui dit `règle:` est déduite, `document:` est lue, `calcul:` est
 * calculée. Rien à déclarer en plus, et une flèche de moins à taper.
 */
export function ligneDeProvenance({ type = PROVENANCE.TEXTE, quoi = "" } = {}, profondeur = 1) {
  const dit = texte(quoi);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.PROVENANCE, `${texte(type) || PROVENANCE.TEXTE}:`),
    espace(),
    jeton(JETON.SOURCE, dit)
  ];
}

/**
 * `parce que: "…"` — la preuve, sous la provenance qu'elle appuie.
 *
 * Elle est indentée d'un cran de plus : une preuve appartient à une provenance,
 * et le jour où une règle en portera plusieurs, on saura laquelle appuie
 * laquelle sans rien changer à la grammaire.
 */
export function ligneDePreuve(citation = "", profondeur = 2) {
  const dit = texte(citation).replace(/^[«"\u0027]\s*/, "").replace(/\s*[»"\u0027]$/, "");
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_RAISON, "parce que:"),
    espace(),
    jeton(JETON.RAISON, `"${dit}"`)
  ];
}

/** `statut: retenu` — l'état du raisonnement dans ce projet. */
export function ligneDeStatut(statut = "", profondeur = 1) {
  const dit = texte(statut);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_STATUT, "statut:"),
    espace(),
    jeton(JETON.STATUT, dit)
  ];
}

/**
 * `le: 12 mars 2026` — quand un constat a été fait.
 *
 * Propre aux constats, et indispensable à eux : un constat sans date ne vaut
 * rien. « L'escalier n'était pas encloisonné » — quand ? avant ou après la
 * reprise ? Une observation qu'on ne peut pas situer dans le temps ne se
 * conteste ni ne se lève.
 */
export function ligneDeDate(quand = "", profondeur = 1) {
  const dit = texte(quand);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_DATE, "le:"),
    espace(),
    jeton(JETON.DATE, dit)
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les blocs : une forme par nature
 *
 * Un constat ne se présente pas comme une règle, et une règle pas comme une
 * contrainte. Chaque nature a sa forme, et son extension de fichier l'annonce —
 * `.ref`, `.ctr`, `.ddb`, `.hyp`, `.cst`. On sait ce qu'on lit avant d'avoir lu.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Une accolade, seule sur sa ligne.
 *
 * ## Pourquoi des accolades, alors que l'indentation suffisait
 *
 * Elle suffisait à la machine, pas à l'œil. Un bloc de sept lignes dont la
 * fin ne se marque que par un retour au niveau zéro se relit mal sur un écran,
 * et se relit très mal quand deux blocs se suivent. L'accolade dit où le bloc
 * finit, sans qu'il faille compter les espaces.
 *
 * Elle n'est pas un mot de programmeur : c'est une **borne**, et un CCTP en
 * emploie d'autres pour la même raison. Elle rend en outre le pliage possible,
 * qui est ce qui rend un fichier de cent affirmations lisible.
 *
 * On ne dépend donc plus de la seule mise en forme du rendu : le texte brut,
 * copié dans un éditeur quelconque, garde sa structure.
 */
export function ligneOuvrante(profondeur = 0) {
  return [espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.ACCOLADE, "{")];
}

export function ligneFermante(profondeur = 0) {
  return [espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.ACCOLADE, "}")];
}

/** Une ligne vide, qui sépare deux blocs. */
export function ligneVide() {
  return [];
}

/**
 * `zone: Bâtiment A {` — l'ouverture d'une section de portée.
 *
 * ## Pourquoi la zone est dans le fichier, et non dans l'arborescence
 *
 * L'unité de production est le **domaine** : une étude incendie touche
 * plusieurs zones d'un coup. Avec la zone en répertoire, une seule étude se
 * dispersait en autant de fichiers, donc autant de groupes dans le diff, pour
 * un seul acte.
 *
 * La zone est une **facette**, pas un lieu. Le fichier s'organise comme on
 * produit ; la Mémoire s'organise comme on consulte, et c'est là que la vue par
 * zone a sa place, sans coûter un répertoire.
 *
 * « Toutes zones » vient toujours en premier : ce qui vaut partout se lit avant
 * ce qui ne vaut qu'ici.
 */
export function ligneDeZone(zone = TOUTES_ZONES, profondeur = 0) {
  return [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_ZONE, "zone:"),
    espace(),
    jeton(JETON.ZONE, texte(zone) || TOUTES_ZONES),
    espace(),
    jeton(JETON.ACCOLADE, "{")
  ];
}

/**
 * Une règle, telle qu'un référentiel la porte. Fichier `.ref`.
 *
 * ```
 * fonction Classement du bâtiment(Logements superposés, Hauteur du plancher bas) {
 *    si (Logements superposés = oui)
 *    et (Hauteur du plancher bas <= 28 m)
 *    alors ("3e famille B");
 *    texte: arrêté du 31 janvier 1986 modifié, article 3, 3°
 *       parce que: "Troisième famille B : …"
 * }
 * ```
 *
 * Aucune valeur de projet n'y figure, et c'est tout l'intérêt : ce bloc vaut
 * pour mille bâtiments. Aucun statut non plus — un référentiel n'a pas d'état
 * dans un projet.
 *
 * @param {number} profondeur le cran d'indentation du bloc, dans sa zone
 */
export function blocDeRegle({
  sujet = "", conditions = [], alors = "", sinon = "", sauf = [], provenance = null, preuve = ""
} = {}, profondeur = 0) {
  const dedans = profondeur + 1;
  const toutes = [...(Array.isArray(conditions) ? conditions : []), ...(Array.isArray(sauf) ? sauf : [])];

  const commeUneRegle = { regle: true };

  const corps = [];
  (Array.isArray(conditions) ? conditions : []).forEach((condition, rang) => {
    corps.push(ligneDeCondition(rang === 0 ? "si" : (condition.joint || "et"), condition, dedans, commeUneRegle));
  });

  if (texte(alors)) corps.push(ligneDeConsequence("alors", alors, "", dedans, commeUneRegle));
  if (texte(sinon)) corps.push(ligneDeConsequence("sinon", sinon, "", dedans, commeUneRegle));

  for (const exception of (Array.isArray(sauf) ? sauf : [sauf]).filter(Boolean)) {
    corps.push(ligneDeCondition("sauf si", exception, dedans, commeUneRegle));
  }

  const depuis = provenance ? ligneDeProvenance(provenance, dedans) : null;
  if (depuis) corps.push(depuis);

  const pourquoi = ligneDePreuve(preuve, dedans + 1);
  if (pourquoi) corps.push(pourquoi);

  const tete = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    ...ligneDeDonnee(sujet, toutes.map((condition) => condition?.sujet), commeUneRegle)
  ];

  return corps.length
    ? [[...tete, espace(), jeton(JETON.ACCOLADE, "{")], ...corps, ligneFermante(profondeur)]
    : [tete];
}

/**
 * Une affirmation de projet. Fichiers `.ctr`, `.ddb`, `.hyp`, `.cst`.
 *
 * ```
 * Colonne sèche = "exigée, une colonne sèche de 65 mm par escalier" {
 *    règle: Colonne sèche — arrêté du 31 janvier 1986, article 98
 *    statut: retenu
 * }
 * ```
 *
 * La règle n'est pas recopiée ici : elle a son fichier, à côté.
 *
 * Une affirmation qui ne porte rien d'autre que sa valeur ne s'entoure pas
 * d'accolades : une paire de bornes autour de rien serait du bruit.
 */
export function blocDAffirmation({
  sujet = "", valeur = "", unite = "", provenance = null, preuve = "", statut = "", le = ""
} = {}, profondeur = 0) {
  const dedans = profondeur + 1;
  const corps = [];

  // La date passe avant la provenance : un constat se situe d'abord dans le
  // temps, et c'est la première question qu'on lui pose.
  const quand = ligneDeDate(le, dedans);
  if (quand) corps.push(quand);

  const depuis = provenance ? ligneDeProvenance(provenance, dedans) : null;
  if (depuis) corps.push(depuis);

  const pourquoi = ligneDePreuve(preuve, dedans + 1);
  if (pourquoi) corps.push(pourquoi);

  const etat = ligneDeStatut(statut, dedans);
  if (etat) corps.push(etat);

  const tete = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    ...ligneDAffirmation({ sujet, valeur, unite })
  ];

  return corps.length
    ? [[...tete, espace(), jeton(JETON.ACCOLADE, "{")], ...corps, ligneFermante(profondeur)]
    : [tete];
}

/**
 * Un fichier entier : ses zones, et les blocs de chacune.
 *
 * ## L'ordre, et le blanc entre les blocs
 *
 * « Toutes zones » d'abord : ce qui vaut partout se lit avant ce qui ne vaut
 * qu'ici. Puis les zones dans l'ordre où le projet les a découpées.
 *
 * Une ligne vide sépare deux blocs. Ce n'est pas de l'ornement : sans elle,
 * l'accolade fermante d'un bloc et la tête du suivant se collent, et l'œil ne
 * voit plus où l'un finit.
 *
 * @param {{zone: string, blocs: object[][]}[]} sections
 */
export function corpsDuFichier(sections = []) {
  const lignes = [];

  const rangees = (Array.isArray(sections) ? sections : []).filter((section) => section?.blocs?.length);
  rangees.forEach((section, rang) => {
    if (rang > 0) lignes.push(ligneVide());
    lignes.push(ligneDeZone(section.zone));

    section.blocs.forEach((bloc, position) => {
      if (position > 0) lignes.push(ligneVide());
      lignes.push(...bloc);
    });

    lignes.push(ligneFermante(0));
  });

  return lignes;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'en-tête d'un fichier
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Le nom d'un fichier : son sujet, et l'extension qui dit ce qu'il contient.
 *
 * ## Pourquoi une extension par nature
 *
 * Deux `incendie.mdall` à deux endroits de l'arborescence n'ont pas de sens, et
 * c'est dangereux : on ouvre l'un en croyant l'autre. L'extension dit ce qu'on
 * lit avant de l'avoir lu, comme `.html`, `.css` et `.js` disent trois choses
 * différentes du même `app`.
 *
 * ```
 * escalier-b/incendie.ref    les règles appliquées
 * escalier-b/incendie.ctr    ce qui s'impose
 * escalier-b/incendie.ddb    ce qui a été relevé
 * escalier-b/incendie.hyp    ce qu'on suppose
 * escalier-b/incendie.cst    ce qui a été constaté, à une date
 * escalier-b/incendie.crp    ce qui est entré au dossier
 * ```
 *
 * Même nom de base, extensions différentes : c'est le même sujet, vu sous cinq
 * angles. Et chaque extension annonce une **forme** — une règle ne se présente
 * pas comme un constat.
 */
export function nomDeFichier(chemin = [], extension = "mdall") {
  const morceaux = (Array.isArray(chemin) ? chemin : [chemin]).map(texte).filter(Boolean);
  const dernier = morceaux[morceaux.length - 1] ?? "memoire";
  return `${normaliser(dernier)}.${texte(extension) || "mdall"}`;
}

/** « escalier-b/incendie.ctr » — le chemin entier. */
export function cheminDeFichier(chemin = [], extension = "mdall") {
  const morceaux = (Array.isArray(chemin) ? chemin : [chemin]).map(texte).filter(Boolean);
  if (morceaux.length < 2) return nomDeFichier(morceaux, extension);
  return `${morceaux.slice(0, -1).map(normaliser).join("/")}/${nomDeFichier(morceaux, extension)}`;
}

function normaliser(morceau) {
  return texte(morceau)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "memoire";
}

/** `fichier: escalier-b/incendie.ctr` */
export function ligneDeSection(chemin = [], extension = "mdall") {
  return [
    jeton(JETON.MOT_FICHIER, "fichier:"),
    espace(),
    jeton(JETON.SECTION, cheminDeFichier(chemin, extension))
  ];
}

/** `note: une remarque` */
export function ligneDeNote(phrase = "") {
  return [jeton(JETON.NOTE, "note:"), espace(), jeton(JETON.NOTE, texte(phrase))];
}

/**
 * L'en-tête : ce que le fichier est, ce qui l'a produit, comment il s'écrit.
 *
 * Les deux dernières comptent autant l'une que l'autre : la première dit qu'on
 * lit une transcription et non un programme ; la seconde permet de distinguer,
 * six mois plus tard, un changement de valeur d'un changement de façon d'écrire.
 */
export function enTeteDeFichier({ chemin = [], extension = "mdall", produitPar = "", le = "" } = {}) {
  const lignes = [ligneDeSection(chemin, extension)];

  if (texte(produitPar)) {
    lignes.push(ligneDeNote(`établi par ${texte(produitPar)}${texte(le) ? `, le ${texte(le)}` : ""}`));
  }
  lignes.push(ligneDeNote(`écriture Mdall v${ECRITURE}`));

  return lignes;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Mise à plat
 * ──────────────────────────────────────────────────────────────────────────── */

/** Une ligne de jetons, remise à plat. C'est ce qui part dans un extrait. */
export function enClair(jetons = []) {
  return (Array.isArray(jetons) ? jetons : []).map((entree) => entree.texte).join("");
}

/** Un fichier entier, remis à plat. */
export function texteDesLignes(lignes = []) {
  return (Array.isArray(lignes) ? lignes : []).map(enClair).join("\n");
}

/**
 * De quelle nature est une ligne, lue depuis son texte.
 *
 * Sert au rendu d'un extrait cité dans une discussion : le message ne porte que
 * du texte, et c'est à sa première marque qu'on retrouve comment le colorer.
 * C'est le seul chemin qui relit l'écriture au lieu de l'écrire — et il ne lit
 * que la marque de tête, jamais le contenu.
 */
export function natureDeLaLigne(ligne = "") {
  // Les colonnes de numéros passent avant la marque : un extrait cité les
  // porte, et lire le tout premier caractère y trouvait un espace. La marque
  // est le premier caractère qui ne soit ni un blanc ni un chiffre.
  const nu = String(ligne ?? "").replace(/^[\s\d]+/, "");
  const marque = nu[0] ?? "";

  if (marque === "-") return "retire";
  if (marque === "+") return "ajoute";
  if (/^fichier:/i.test(nu)) return "section";
  if (/^note:/i.test(nu)) return "note";
  return "contexte";
}
