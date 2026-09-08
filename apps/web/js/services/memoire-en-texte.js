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
 *
 * v4.2 — ce qui fonde une règle se déclare en tête, comme les `const` d'une
 * fonction : `soit texte = …`, `soit parce que = …`. Les commentaires `//` et
 * `/* … *\/` entrent dans le langage, et `const` définit un nom du projet.
 *
 * v4.3 — une fonction est **auto-portée** : un commentaire dit à quoi elle sert,
 * `importe` d'où viennent ses entrées, `enregistre` où va son résultat, et la
 * portée est son premier paramètre. Une déclaration de variable porte ce qu'elle
 * désigne, ce à quoi elle sert et où elle sert déjà.
 *
 * v4.4 — le commentaire passe **dans** la fonction, pour qu'elle se copie
 * entière d'un projet à l'autre ; `importe` porte la zone de ce qu'il emprunte ;
 * et une variable s'écrit une fois, avec ses valeurs par zone en tableau —
 * `Sujet = [ Bâtiment A: …, Bâtiment B: … ];`.
 */
export const ECRITURE = "4.4";

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
  /** `soit` — le mot qui déclare une locale, en tête de règle. */
  MOT_SOIT: "mot-soit",
  /** `const` — le mot qui déclare une variable du projet. */
  MOT_CONST: "mot-const",
  /** `enregistre`, `décision humaine assumée` — les verbes qui agissent. */
  MOT_NATIF: "mot-natif",
  /**
   * `importe` — le seul verbe qui n'agit pas : il déclare une dépendance, comme
   * un `import` de module. Il prend donc la couleur des mots-clés, pas celle
   * des appels.
   */
  MOT_IMPORTE: "mot-importe",
  /**
   * Le chemin d'un fichier, cité dans un `importe` ou un `enregistre`.
   *
   * `chemin` et non `fichier` : `mdall-fichier` désigne déjà, dans la feuille
   * de style, la **carte** qui encadre un fichier de l'Atelier. Deux sens pour
   * une classe donnaient une bordure autour d'un chemin.
   */
  CHEMIN: "chemin",
  /** `zones` — le paramètre de portée, cité comme tel. */
  PORTEE: "portee",
  /** Le nom d'une locale : `texte`, `document`, `parce que`. */
  LOCALE: "locale",
  /** `// …` ou `/* … *\/` — ce qu'on écrit pour soi, jamais interprété. */
  COMMENTAIRE: "commentaire",
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
  // Les mots d'un `.ref`, et eux seuls. Ils sont empruntés à un langage de
  // programmation parce qu'un `.ref` en est un : il s'exécute. `fonction`
  // l'ouvre, `soit` déclare ce qui la fonde, `const` définit un nom du projet.
  // Voir l'en-tête, « L'identité de l'écriture, et pourquoi elle a bougé ».
  "fonction", "soit", "const",
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

/**
 * Une valeur, écrite selon qu'elle se mesure ou se cite.
 *
 * Exportée parce que la lecture en a besoin pour recolorer une valeur trouvée
 * ailleurs que sur une ligne d'affirmation — dans un `enregistre`, par exemple.
 * Deux façons d'écrire une valeur finiraient par ne plus s'accorder.
 */
export function jetonsDeValeur(valeur, unite = "") {
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
 * Les verbes du langage — ce qu'une règle sait **faire**, et pas seulement dire.
 *
 * ## Pourquoi un langage de métier a des verbes
 *
 * Une règle qui se contente de conclure laisse la moitié du travail à celui qui
 * la lit : où est-ce écrit ? qui l'a décidé ? que fait-on si le référentiel ne
 * s'applique pas ? Ces gestes-là reviennent dans tous les projets, et les
 * écrire en prose à chaque fois donne mille formulations pour une seule chose.
 *
 * La liste est **fermée**, et c'est ce qui en fait un langage : un verbe de plus
 * inventé au fil de l'eau ne se relirait nulle part.
 *
 * | verbe | ce qu'il fait |
 * | --- | --- |
 * | `importe` | dit d'où vient une entrée, et où aller la lire |
 * | `enregistre` | écrit une valeur dans un fichier, sur une portée |
 * | `décision humaine assumée` | quelqu'un a tranché, et il signe |
 *
 * D'autres suivront, et le besoin les nommera plutôt que l'imagination :
 * `constate` (une observation datée), `suppose` (avec ce qui la lèverait),
 * `sans objet` (le référentiel ne s'applique pas, ce qui n'est pas une
 * condition fausse), `à vérifier` (la machine s'arrête et appelle quelqu'un).
 */
export const VERBES = {
  IMPORTE: "importe",
  ENREGISTRE: "enregistre",
  DECISION: "décision humaine assumée"
};

/**
 * `décision humaine assumée (réunion de chantier du 3 mars, par: Nicolas L., le: 12 mars 2026);`
 *
 * ## Pourquoi un verbe, et non une provenance de plus
 *
 * `hypothèse:` dit d'où une valeur vient ; **ce verbe dit qui la porte**. Les
 * deux ne se remplacent pas : une hypothèse se lève quand la donnée arrive, une
 * décision se conteste devant celui qui l'a prise. Sans nom et sans date, une
 * valeur tranchée à la main se relit six mois plus tard comme un fait établi —
 * et personne ne sait plus qu'elle était un choix.
 *
 * Il remplace la ligne `décision:` quand on sait qui a tranché et quand : la
 * mémoire le sait depuis toujours — `decided_by`, `decided_at` — et ne le
 * montrait nulle part.
 */
export function ligneDeDecision({ quoi = "", par = "", le = "" } = {}, profondeur = 1) {
  const dit = texte(quoi);
  if (!dit) return null;

  const jetons = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_NATIF, VERBES.DECISION),
    espace(),
    jeton(JETON.PONCTUATION, "("),
    jeton(JETON.SOURCE, dit)
  ];

  // Qui, et quand. Une décision sans auteur ni date n'est pas une décision :
  // c'est une valeur dont plus personne ne répond.
  for (const [cle, dit] of [["par", texte(par)], ["le", texte(le)]]) {
    if (!dit) continue;
    jetons.push(jeton(JETON.PONCTUATION, ","), espace(),
      jeton(JETON.LOCALE, cle), jeton(JETON.PONCTUATION, ":"), espace(),
      jeton(cle === "le" ? JETON.DATE : JETON.SOURCE, dit));
  }

  jetons.push(jeton(JETON.PONCTUATION, ")"), jeton(JETON.PONCTUATION, ";"));
  return jetons;
}

/**
 * `importe (variable: Champ d'application du titre VI, depuis: memoire/incendie.ctr, zones: zones);`
 *
 * ## Pourquoi une règle dit d'où viennent ses entrées
 *
 * Sans cela, une fonction lue seule ne se comprend pas : « Champ d'application
 * du titre VI » apparaît dans une condition sans qu'on sache qui le pose ni où
 * aller le lire. Il faut alors parcourir les autres fichiers pour reconstituer
 * la chaîne — et c'est précisément ce que la mémoire existe pour éviter.
 *
 * Une fonction **auto-portée** se lit d'un bout à l'autre : ce dont elle a
 * besoin, d'où cela vient, ce qu'elle en fait, et où le résultat va.
 *
 * Un import par ligne : ajouter une entrée ajoute exactement une ligne, et le
 * diff dit « une entrée de plus » plutôt que de redessiner un bloc.
 */
export function ligneDImport({ variable = "", depuis = "", zones = "zones" } = {}, profondeur = 1) {
  const nom = texte(variable);
  if (!nom) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_IMPORTE, "importe"),
    espace(),
    jeton(JETON.PONCTUATION, "("),
    jeton(JETON.LOCALE, "variable"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.SUJET, nom),
    jeton(JETON.PONCTUATION, ","),
    espace(),
    jeton(JETON.LOCALE, "depuis"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.CHEMIN, texte(depuis) || "inconnu"),
    jeton(JETON.PONCTUATION, ","),
    espace(),
    // La zone fait partie de l'emprunt : une variable n'a pas une valeur, elle
    // en a une **par partie d'ouvrage**. Importer sans dire laquelle
    // reviendrait à en prendre une au hasard.
    jeton(JETON.LOCALE, "zones"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PORTEE, texte(zones) || "zones"),
    jeton(JETON.PONCTUATION, ")"),
    jeton(JETON.PONCTUATION, ";")
  ];
}

/**
 * `enregistre ( Sujet: "valeur", dans: incendie.ctr, zones: zones )`
 *
 * Ce que la règle **fait** de sa conclusion. Une règle qui se contente de
 * conclure laisse ouverte la question qui vient toujours après : « et alors, où
 * est-ce écrit ? ». Le bloc y répond sur place — le fichier qui reçoit, et la
 * portée sur laquelle cela vaut.
 *
 * Il s'écrit sur plusieurs lignes, contrairement à l'import : chacun de ses
 * trois champs peut changer seul, et une seule ligne les ferait tous bouger
 * ensemble dans le diff.
 *
 * @returns {object[][]} les lignes du bloc
 */
export function blocDEnregistrement({ sujet = "", valeur = "", unite = "", dans = "", zones = "zones" } = {}, profondeur = 2) {
  const nom = texte(sujet);
  if (!nom) return [];

  const dedans = profondeur + 1;
  const lignes = [[
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_NATIF, "enregistre"),
    espace(),
    jeton(JETON.PONCTUATION, "(")
  ]];

  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.SUJET, nom),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    ...jetonsDeValeur(valeur, unite),
    jeton(JETON.PONCTUATION, ",")
  ]);

  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, "dans"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.CHEMIN, texte(dans) || "inconnu"),
    jeton(JETON.PONCTUATION, ",")
  ]);

  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, "zones"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PORTEE, texte(zones) || "zones")
  ]);

  lignes.push([espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, ")")]);
  return lignes;
}

/**
 * `soit texte = "arrêté du 31 janvier 1986, article 98";`
 *
 * Une locale d'une règle. Elle se pose en tête du bloc, avant les conditions,
 * comme on déclare les `const` d'une fonction avant de s'en servir : ce qui
 * fonde la règle se lit avant ce qu'elle fait, et non après.
 *
 * Le nom reste celui du concept — `texte`, `document`, `règle`, `parce que` —
 * parce que c'est lui qui porte le sens. `soit machin = …` ne dirait rien.
 */
export function ligneDeLocale(nom = "", valeur = "", profondeur = 1) {
  const quoi = texte(valeur);
  if (!texte(nom) || !quoi) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_SOIT, "soit"),
    espace(),
    jeton(JETON.LOCALE, texte(nom)),
    espace(),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    espace(),
    jeton(JETON.VALEUR, `"${quoi.replace(/^["\u00ab]\s*/, "").replace(/\s*["\u00bb]$/, "")}"`),
    jeton(JETON.PONCTUATION, ";")
  ];
}

/**
 * ```
 * const Hauteur du plancher bas = {
 *    type: "mesure",
 *    unité: "m",
 *    description: "Hauteur du plancher bas du logement le plus haut…",
 *    utilisation: "Entrée du classement en famille, article 3 de l'arrêté…",
 *    déjà utilisé dans: [
 *       Classement du bâtiment (incendie.ref)
 *    ]
 * };
 * ```
 *
 * ## Ce que ce bloc dit, et ce qu'il ne dit pas
 *
 * Elle **définit** un nom : ce qu'il désigne, comment il se mesure. Elle ne dit
 * pas ce qu'il vaut dans ce projet — une variable prend plusieurs valeurs au
 * fil d'une étude, et une définition qui porterait l'une d'elles cesserait
 * d'être vraie au premier versement.
 *
 * C'est ce qu'on lit **avant** d'écrire une règle : pour réutiliser un nom qui
 * existe plutôt que d'en inventer un voisin. Entre « Hauteur du plancher bas »
 * et « Hauteur du dernier plancher », on se trompe vite, et un nom mal
 * orthographié fabrique une seconde variable qui ne servira jamais.
 *
 * ## Pourquoi il en dit autant
 *
 * Dix-huit mois de chantier et douze mois d'études font des milliers de noms.
 * Si personne ne sait dire ce que fait celui-ci, chacun en recréera un voisin —
 * et la mémoire se remplira de synonymes qui ne se rejoignent jamais. Le nom, le
 * type et l'unité ne suffisent pas : il faut ce qu'il **désigne**, ce à quoi il
 * **sert**, et où il sert **déjà**.
 *
 * @param {{nom: string, type?: string, unite?: string, description?: string,
 *          utilisation?: string, usages?: {fonction: string, fichier: string}[]}} variable
 */
export function blocDeVariable({
  nom = "", type = "", unite = "", description = "", utilisation = "", usages = []
} = {}, profondeur = 0) {
  const dit = texte(nom);
  if (!dit) return [];

  const dedans = profondeur + 1;
  const lignes = [[
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_CONST, "const"),
    espace(),
    // Le nom porte le jeton d'un sujet : c'est le même nom que les règles
    // citent, et il doit se colorer et se survoler comme lui.
    jeton(JETON.SUJET, dit),
    espace(),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    espace(),
    jeton(JETON.PONCTUATION, "{")
  ]];

  const champ = (cle, valeur, virgule = true) => [
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, cle),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.VALEUR, `"${texte(valeur)}"`),
    ...(virgule ? [jeton(JETON.PONCTUATION, ",")] : [])
  ];

  lignes.push(champ("type", texte(type) || "inconnu"));
  if (texte(unite)) lignes.push(champ("unité", texte(unite)));
  lignes.push(champ("description", texte(description) || À_DÉCRIRE.description));
  lignes.push(champ("utilisation", texte(utilisation) || À_DÉCRIRE.utilisation));

  // Où elle sert déjà : la fonction, et le fichier où on la trouve. C'est la
  // liste qui empêche d'en recréer une treize millième — on voit d'un coup
  // d'œil que celle-ci fait déjà le travail.
  const emplois = (Array.isArray(usages) ? usages : []).filter((usage) => texte(usage?.fonction));
  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, "déjà utilisé dans"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PONCTUATION, emplois.length ? "[" : "[]")
  ]);

  emplois.forEach((usage, rang) => {
    lignes.push([
      espace(RETRAIT.repeat(dedans + 1)),
      jeton(JETON.SUJET, texte(usage.fonction)),
      espace(),
      jeton(JETON.PONCTUATION, "("),
      jeton(JETON.CHEMIN, texte(usage.fichier) || "inconnu"),
      jeton(JETON.PONCTUATION, ")"),
      ...(rang < emplois.length - 1 ? [jeton(JETON.PONCTUATION, ",")] : [])
    ]);
  });

  if (emplois.length) lignes.push([espace(RETRAIT.repeat(dedans)), jeton(JETON.PONCTUATION, "]")]);

  lignes.push([espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, "}"), jeton(JETON.PONCTUATION, ";")]);
  return lignes;
}

/**
 * Ce qu'on écrit quand personne n'a encore écrit.
 *
 * Pas une phrase vague, pas un champ absent : une phrase qui **appelle** celui
 * qui passe à la remplir. Sur douze mille variables, une description manquante
 * qui ne se voit pas est une variable qu'on recréera.
 */
export const À_DÉCRIRE = {
  description: "À DÉCRIRE — que désigne exactement ce nom, et comment se mesure-t-il ?",
  utilisation: "À DÉCRIRE — dans quel calcul, selon quel texte, pour décider de quoi ?"
};

/**
 * `// ce qu'on écrit pour soi`
 *
 * Un commentaire n'est jamais interprété : il ne pose rien, ne conditionne
 * rien, et se relit tel quel. Il devient nécessaire dès qu'une règle passe
 * quinze lignes — expliquer pourquoi une condition existe est autre chose que
 * dire ce qu'elle teste.
 *
 * `note:` existait déjà, mais pour le **fichier** : une note en tête dit d'où
 * il vient. Un commentaire se met où l'on veut, et c'est ce qui manquait.
 */
export function ligneDeCommentaire(phrase = "", profondeur = 0) {
  const dit = texte(phrase);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.COMMENTAIRE, dit.startsWith("//") || dit.startsWith("/*") ? dit : `// ${dit}`)
  ];
}

/**
 * `texte: arrêté du 31 janvier 1986 modifié, article 6`
 *
 * Le mot-clé **est** le type, et le type **est** l'origine de la valeur : une
 * ligne qui dit `règle:` est déduite, `document:` est lue, `calcul:` est
 * calculée. Rien à déclarer en plus, et une flèche de moins à taper.
 */
export function ligneDeProvenance({ type = PROVENANCE.TEXTE, quoi = "", par = "", le = "" } = {}, profondeur = 1, { regle = false } = {}) {
  const dit = texte(quoi);
  if (!dit) return null;

  // Une décision se signe. Quand on sait qui a tranché et quand, la ligne le
  // dit : sans nom ni date, une valeur choisie à la main se relit six mois
  // plus tard comme un fait établi, et personne ne sait plus que c'était un
  // choix. La mémoire le savait déjà et ne le montrait pas.
  if (texte(type) === PROVENANCE.DECISION && (texte(par) || texte(le))) {
    return ligneDeDecision({ quoi: dit, par, le }, profondeur);
  }

  // Dans une règle, la provenance se **déclare** : elle se pose en tête du
  // bloc, comme les `const` d'une fonction, et le nom de la locale reste le
  // type — `soit texte = …`, `soit document = …`. On sait ainsi d'où la règle
  // sort avant de lire ce qu'elle fait, plutôt qu'après.
  if (regle) return ligneDeLocale(texte(type) || PROVENANCE.TEXTE, dit, profondeur);

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
export function ligneDePreuve(citation = "", profondeur = 2, { regle = false } = {}) {
  const dit = texte(citation).replace(/^[«"\u0027]\s*/, "").replace(/\s*[»"\u0027]$/, "");
  if (!dit) return null;

  // Dans une règle, la preuve se déclare comme la provenance : en tête, et au
  // même cran qu'elle. Indentée d'un de plus, elle paraissait appartenir à la
  // ligne du dessus alors qu'elle fonde le bloc entier.
  if (regle) return ligneDeLocale("parce que", dit, Math.max(1, profondeur));

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
 *    soit texte = "arrêté du 31 janvier 1986 modifié, article 3, 3°";
 *    soit parce que = "Troisième famille B : …";
 *
 *    si (Logements superposés = oui)
 *    et (Hauteur du plancher bas <= 28 m)
 *    alors ("3e famille B");
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
  sujet = "", quoi = "", conditions = [], alors = "", sinon = "", sauf = [],
  provenance = null, preuve = "", importe = [], enregistre = null, portee = "zones"
} = {}, profondeur = 0) {
  const dedans = profondeur + 1;
  const toutes = [...(Array.isArray(conditions) ? conditions : []), ...(Array.isArray(sauf) ? sauf : [])];

  const commeUneRegle = { regle: true };

  const corps = [];

  // D'où viennent les entrées, d'abord : une fonction lue seule doit dire où
  // aller lire ce dont elle a besoin, sinon il faut parcourir les autres
  // fichiers pour reconstituer la chaîne.
  for (const entree of Array.isArray(importe) ? importe : []) {
    const ligne = ligneDImport(entree, dedans);
    if (ligne) corps.push(ligne);
  }
  if (corps.length) corps.push(ligneVide());

  // Puis les locales, comme les `const` d'une fonction : ce qui fonde la règle
  // se lit avant ce qu'elle fait. Elles étaient en bas, après la conclusion —
  // c'est-à-dire là où on ne les cherche plus.
  const localesDebut = corps.length;
  const depuis = provenance ? ligneDeProvenance(provenance, dedans, commeUneRegle) : null;
  if (depuis) corps.push(depuis);

  const pourquoi = ligneDePreuve(preuve, dedans, commeUneRegle);
  if (pourquoi) corps.push(pourquoi);

  // Une ligne vide entre ce qu'on pose et ce qu'on en fait : sans elle, les
  // deux se lisent comme une seule suite d'instructions.
  if (corps.length > localesDebut) corps.push(ligneVide());

  (Array.isArray(conditions) ? conditions : []).forEach((condition, rang) => {
    corps.push(ligneDeCondition(rang === 0 ? "si" : (condition.joint || "et"), condition, dedans, commeUneRegle));
  });

  // La conclusion, et ce qu'on en fait. Un `enregistre` répond à la question
  // qui vient toujours après « alors quoi ? » : où est-ce écrit, et pour quelle
  // partie de l'ouvrage.
  if (texte(alors)) {
    corps.push(...(enregistre
      ? lignesDeConclusion("alors", { ...enregistre, sujet: texte(enregistre.sujet) || texte(sujet), valeur: alors, zones: portee }, dedans)
      : [ligneDeConsequence("alors", alors, "", dedans, commeUneRegle)]));
  }
  if (texte(sinon)) {
    corps.push(...(enregistre
      ? lignesDeConclusion("sinon", { ...enregistre, sujet: texte(enregistre.sujet) || texte(sujet), valeur: sinon, zones: portee }, dedans)
      : [ligneDeConsequence("sinon", sinon, "", dedans, commeUneRegle)]));
  }

  for (const exception of (Array.isArray(sauf) ? sauf : [sauf]).filter(Boolean)) {
    corps.push(ligneDeCondition("sauf si", exception, dedans, commeUneRegle));
  }

  // La portée est un paramètre, et le premier : une même règle s'applique à
  // plusieurs parties de l'ouvrage, et la recopier par zone en ferait trois
  // règles à maintenir pour un seul raisonnement.
  const entrees = [texte(portee) || "zones", ...toutes.map((condition) => condition?.sujet)];

  const tete = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    ...ligneDeDonnee(sujet, entrees, commeUneRegle)
  ];

  // Le commentaire vit **dans** la fonction, en première ligne. Au-dessus, il
  // appartenait au fichier : copier la fonction pour la porter dans un autre
  // projet — ce qu'on fait, et ce qu'on fera de plus en plus — laissait
  // l'explication derrière. Une fonction auto-portée emporte ce qu'elle dit
  // d'elle-même.
  const dit = ligneDeCommentaire(quoi, dedans);

  return corps.length || dit
    ? [
        [...tete, espace(), jeton(JETON.ACCOLADE, "{")],
        ...(dit ? [dit, ...(corps.length ? [ligneVide()] : [])] : []),
        ...corps,
        ligneFermante(profondeur)
      ]
    : [tete];
}

/**
 * `alors ( enregistre ( … ) );` — la conclusion, et ce qu'elle écrit.
 *
 * Deux niveaux de parenthèses, comme un appel dans un appel : c'est ce que
 * c'est. `alors` dit que la branche est prise, `enregistre` dit ce qu'on en
 * fait — et les séparer permet de conclure sans rien écrire, ce qui arrive
 * pour une règle qui ne fait que produire une valeur intermédiaire.
 */
export function lignesDeConclusion(mot, enregistre = {}, profondeur = 1) {
  return [
    [
      espace(RETRAIT.repeat(Math.max(1, profondeur))),
      jeton(JETON.MOT_CONDITION, texte(mot)),
      espace(),
      jeton(JETON.PONCTUATION, "(")
    ],
    ...blocDEnregistrement(enregistre, profondeur + 1),
    [espace(RETRAIT.repeat(Math.max(1, profondeur))), jeton(JETON.PONCTUATION, ")"), jeton(JETON.PONCTUATION, ";")]
  ];
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
  sujet = "", valeur = "", unite = "", provenance = null, preuve = "", statut = "", le = "",
  zone = "", virgule = false
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

  // Dans un tableau de valeurs, la tête porte la **zone** et non le sujet : le
  // sujet est écrit une fois, au-dessus. `Bâtiment A: "CF 1/2 h"` — un
  // deux-points, comme un champ, parce que c'en est un.
  const tete = texte(zone)
    ? [
        espace(RETRAIT.repeat(Math.max(0, profondeur))),
        jeton(JETON.ZONE, texte(zone)),
        jeton(JETON.PONCTUATION, ":"),
        espace(),
        ...jetonsDeValeur(valeur, unite)
      ]
    : [
        espace(RETRAIT.repeat(Math.max(0, profondeur))),
        ...ligneDAffirmation({ sujet, valeur, unite })
      ];

  const fin = virgule ? [jeton(JETON.PONCTUATION, ",")] : [];

  return corps.length
    ? [
        [...tete, espace(), jeton(JETON.ACCOLADE, "{")],
        ...corps,
        [...ligneFermante(profondeur), ...fin]
      ]
    : [[...tete, ...fin]];
}

/**
 * Une variable et ses valeurs, une par zone.
 *
 * ```
 * Degré coupe-feu des planchers = [
 *    Toutes zones: "CF 1 h" {
 *       règle: arrêté du 31 janvier 1986, article 6
 *       statut: retenu
 *    },
 *    Bâtiment A: "CF 1/2 h" { … }
 * ];
 * ```
 *
 * ## Pourquoi un tableau, et non trois sections
 *
 * Le fichier se découpait par zone, et le nom de la variable se répétait dans
 * chacune. Trois fois le même nom à trois endroits différents, pour une seule
 * chose : **une variable du projet, qui prend une valeur par partie
 * d'ouvrage**. Chercher « degré coupe-feu des planchers » donnait trois
 * réponses sans dire qu'il s'agissait de la même.
 *
 * Écrite ainsi, la question qu'il faut se poser devient impossible à éviter :
 * *dans quelle zone ?*. C'est pour cela que `importe` porte lui aussi une
 * portée — emprunter une variable sans dire laquelle reviendrait à en prendre
 * une au hasard.
 *
 * Chaque entrée garde sa provenance et son statut : ce sont deux décisions
 * différentes, prises peut-être par deux personnes, à deux dates. Les mettre en
 * commun effacerait ce que la mémoire existe pour tenir.
 *
 * Une valeur unique qui vaut partout n'ouvre pas de tableau : une paire de
 * crochets autour d'une seule entrée serait du bruit.
 */
export function blocParZone({ sujet = "", valeurs = [] } = {}, profondeur = 0) {
  const entrees = (Array.isArray(valeurs) ? valeurs : []).filter((entree) => entree);
  if (!entrees.length) return [];

  const seule = entrees.length === 1 && texte(entrees[0].zone) === TOUTES_ZONES;
  if (seule) return blocDAffirmation({ ...entrees[0], sujet, zone: "" }, profondeur);

  const dedans = profondeur + 1;

  return [
    [
      espace(RETRAIT.repeat(Math.max(0, profondeur))),
      jeton(JETON.SUJET, texte(sujet)),
      espace(),
      jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
      espace(),
      jeton(JETON.PONCTUATION, "[")
    ],
    ...entrees.flatMap((entree, rang) => blocDAffirmation(
      { ...entree, sujet, zone: texte(entree.zone) || TOUTES_ZONES, virgule: rang < entrees.length - 1 },
      dedans
    )),
    [espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, "]"), jeton(JETON.PONCTUATION, ";")]
  ];
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
