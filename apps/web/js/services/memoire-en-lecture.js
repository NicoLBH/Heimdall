/**
 * Du texte Mdall vers le graphe : l'autre sens de la flèche.
 *
 * ## Pourquoi il existe
 *
 * Tant que le langage n'était qu'une vue, la mémoire vivait dans la base et le
 * texte n'en était qu'un rendu. Deux besoins ont renversé cela :
 *
 * - **un architecte doit pouvoir écrire à la main.** Trois lignes dans un
 *   éditeur, collées dans l'Atelier, et le projet retient une décision. C'est
 *   la porte d'entrée la moins chère qui existe, et elle ne demande aucun
 *   utilitaire ;
 * - **les utilitaires n'écrivent que du mdall.** Incendie, neige, vent, gel :
 *   tous produisent des affirmations, des règles, des preuves. Si le texte est
 *   le format commun, un utilitaire nouveau n'a plus rien à brancher.
 *
 * ## La loi de réciprocité
 *
 * ```
 * lire(écrire(G)) = G
 * ```
 *
 * Chaque information du graphe apparaît **une fois** dans le texte, et rien de
 * déductible n'y apparaît. Un test la vérifie sur des blocs réels. C'est elle
 * qui autorise à dire que le texte **est** la mémoire, et pas une vue de la
 * mémoire — et c'est elle qui interdit d'ajouter au langage une information
 * qu'on ne saurait pas relire.
 *
 * ## Ce que la lecture pardonne
 *
 * Elle accepte les deux guillemets, droits et français. Elle accepte les
 * comparateurs écrits en signes ou en toutes lettres. Elle accepte une
 * indentation de deux, trois ou quatre espaces, et la tabulation, qu'elle
 * ramène au pas canonique. Personne ne doit être refusé pour une raison
 * typographique : ce qui compte est le sens, et il est toujours porté par le
 * premier mot de la ligne.
 *
 * ## Ce qu'elle refuse
 *
 * Elle ne devine pas. Une ligne qu'elle ne comprend pas n'est pas ignorée en
 * silence : elle est rendue avec son numéro et sa raison, pour que celui qui a
 * écrit sache où corriger. Une lecture qui avale ce qu'elle ne comprend pas
 * ferait entrer en mémoire un fichier amputé sans que personne ne le sache.
 */

import {
  OPERATEUR, PROVENANCES, STATUTS, RETRAIT, JETON,
  ligneDAffirmation, ligneDeDonnee, ligneDeCondition, ligneDeConsequence,
  ligneDeProvenance, ligneDePreuve, ligneDeStatut, ligneDeDate, ligneDeNote
} from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les comparateurs, écrits comme on veut.
 *
 * L'écriture rend `<=`, parce que c'est ce qu'un architecte peut taper. La
 * lecture accepte aussi `≤`, parce qu'un fichier plus ancien en porte, et
 * qu'une mémoire ne refuse pas ce qu'elle a elle-même écrit.
 */
const COMPARATEURS = new Map([
  ["=", OPERATEUR.EGAL],
  ["==", OPERATEUR.EGAL],
  ["!=", OPERATEUR.DIFFERENT],
  ["<>", OPERATEUR.DIFFERENT],
  ["≠", OPERATEUR.DIFFERENT],
  ["<=", OPERATEUR.AU_PLUS],
  ["≤", OPERATEUR.AU_PLUS],
  [">=", OPERATEUR.AU_MOINS],
  ["≥", OPERATEUR.AU_MOINS],
  ["<", OPERATEUR.MOINS_DE],
  [">", OPERATEUR.PLUS_DE],
  ["parmi", OPERATEUR.PARMI]
]);

/** Les deux constats qui ne comparent rien : ils closent la ligne. */
const CONSTATS = new Map([
  ["renseigné", OPERATEUR.RENSEIGNE],
  ["renseigne", OPERATEUR.RENSEIGNE],
  ["non renseigné", OPERATEUR.NON_RENSEIGNE],
  ["non renseigne", OPERATEUR.NON_RENSEIGNE]
]);

/**
 * Les mots de tête, du plus long au plus court : « sauf si » avant « si ».
 *
 * Les mots suivis de deux points se cherchent avec leur deux-points : `statut:`
 * et non `statut`. Sans cela, une donnée nommée « Statut de la façade » se
 * lirait comme un statut.
 */
const TETES = [
  "sauf si", "parce que:", "statut:", "fichier:", "note:", "le:", "zone:",
  "fonction", "alors", "sinon", "si", "et", "ou", "non",
  ...PROVENANCES.map((type) => `${type}:`)
];

/**
 * Ce qu'une clause de règle dit, débarrassé de ses bornes.
 *
 * Un `.ref` écrit `si (Hauteur du plancher bas <= 28 m)` et `alors ("3e famille
 * B");` — les parenthèses et le point-virgule bornent, ils ne disent rien.
 * On les retire pour lire, et on les remet pour écrire : ce qui est **déductible
 * de la forme** ne se conserve pas, sans quoi il finirait par diverger d'elle.
 *
 * Un fichier écrit à la main sans elles se lit exactement pareil. C'est
 * volontaire : la ponctuation rend la règle exécutable, elle ne la rend pas
 * obligatoire.
 *
 * @returns {{corps: string, borne: boolean}} `borne` dit si les parenthèses y
 *   étaient — c'est ce qui permet de réécrire la ligne telle qu'elle était.
 */
export function sansBornes(reste = "") {
  const dit = texte(reste).replace(/;\s*$/, "");
  const parentheses = dit.match(/^\(([\s\S]*)\)$/);
  return parentheses
    ? { corps: texte(parentheses[1]), borne: true }
    : { corps: dit, borne: false };
}

/** Ce qu'une ligne ouvre ou ferme. L'accolade borne, elle ne dit rien d'autre. */
function bornesDe(ligne) {
  const nu = texte(ligne);
  return {
    ferme: nu === "}",
    ouvre: nu.endsWith("{"),
    // Le contenu, une fois l'accolade retirée.
    corps: nu.endsWith("{") ? texte(nu.slice(0, -1)) : nu
  };
}

/** La profondeur d'indentation d'une ligne, en pas. */
function retraitDe(ligne) {
  const blancs = (String(ligne).match(/^[\t ]*/) ?? [""])[0].replace(/\t/g, RETRAIT);
  return Math.floor(blancs.length / RETRAIT.length);
}

/** Le mot de tête d'une ligne, et ce qui le suit. */
export function teteDe(ligne = "") {
  const nu = texte(ligne);
  for (const mot of TETES) {
    if (nu.toLowerCase() === mot) return { mot, reste: "" };
    if (nu.toLowerCase().startsWith(`${mot} `)) return { mot, reste: texte(nu.slice(mot.length)) };
  }
  return { mot: "", reste: nu };
}

/**
 * La signature d'une règle : le sujet, et ses entrées entre parenthèses.
 *
 * Les entrées ne se conservent pas — ce sont les sujets des conditions, et une
 * signature recopiée diverge. On les lit pour les jeter : ce qui compte, c'est
 * que la parenthèse ne soit pas prise pour une partie du sujet.
 */
export function lireUneSignature(ligne = "") {
  const dit = texte(ligne);
  const signature = dit.match(/^(.*?)\s*\(([^()]*)\)$/);
  if (!signature) return { sujet: dit, entrees: [] };

  return {
    sujet: texte(signature[1]),
    entrees: signature[2].split(",").map(texte).filter(Boolean)
  };
}

/**
 * Une valeur écrite, ramenée à ce qu'elle est.
 *
 * Les guillemets disent « ceci est un texte » et disparaissent à la lecture.
 * Leur absence dit « ceci se mesure » : le nombre et son unité se séparent, et
 * l'on peut comparer 26 m à 28 m sans comparer des chaînes.
 */
export function lireUneValeur(brut = "") {
  const dit = texte(brut);
  if (!dit) return { valeur: "", unite: "", citee: false };

  const guillemets = dit.match(/^["'«]\s*([\s\S]*?)\s*["'»]$/);
  if (guillemets) return { valeur: guillemets[1], unite: "", citee: true };

  const mesure = dit.match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (mesure) return { valeur: mesure[1], unite: texte(mesure[2]), citee: false };

  return { valeur: dit, unite: "", citee: false };
}

/**
 * Une condition : `Sujet ≤ 28 m`, `Voie-engins parmi "a" ou "b"`.
 *
 * ## Le piège du « ou »
 *
 * « Habitation individuelle ou collective = collective » contient un « ou » qui
 * n'est pas une disjonction. La disjonction ne se cherche donc **qu'à droite du
 * comparateur**, là où un « ou » ne peut être qu'un « ou ». Le comparateur, lui,
 * se cherche sur la ligne entière : un sujet ne contient jamais `=` ni `≤`.
 */
export function lireUneCondition(corps = "") {
  const dit = texte(corps);
  if (!dit) return null;

  // Les deux constats ferment la ligne : « Classement du bâtiment renseigné ».
  for (const [mot, operateur] of CONSTATS) {
    const motif = new RegExp(`^(.*?)\\s+${mot}$`, "i");
    const trouve = dit.match(motif);
    if (trouve) return { sujet: texte(trouve[1]), operateur, valeur: [], unite: "", logique: false };
  }

  const signe = dit.match(/^(.*?)\s*(≤|≥|≠|<=|>=|<>|!=|==|=|<|>)\s*(.*)$/)
    ?? dit.match(/^(.*?)\s+(parmi)\s+(.*)$/i);
  if (!signe) return null;

  const sujet = texte(signe[1]);
  if (!sujet) return null;

  const operateur = COMPARATEURS.get(texte(signe[2]).toLowerCase()) ?? OPERATEUR.EGAL;
  const morceaux = texte(signe[3]).split(/\s+ou\s+/i).map(texte).filter(Boolean);
  const lues = morceaux.map(lireUneValeur);

  return {
    sujet,
    operateur,
    valeur: lues.map((lue) => lue.valeur),
    unite: lues.find((lue) => lue.unite)?.unite ?? "",
    // Oui / non n'est ni un texte cité ni une mesure : c'est une réponse.
    logique: lues.length > 0 && lues.every((lue) => !lue.citee && /^(oui|non)$/i.test(lue.valeur))
  };
}

/** Une ligne de tête : `Sujet = valeur @ zone`, ou `Sujet` seul pour une règle. */
export function lireUneTete(ligne = "") {
  const brut = texte(ligne);
  if (!brut) return null;

  // `fonction` ouvre une règle. Le mot ne se conserve pas — il **est** le fait
  // d'être une règle, et le garder à côté le laisserait diverger de lui.
  const regle = /^fonction\s+/i.test(brut);
  const dit = regle ? texte(brut.replace(/^fonction\s+/i, "")) : brut;

  const egal = dit.match(/^(.*?)\s*=\s*(.*)$/);
  // Pas de `=` : c'est la tête d'une règle, avec sa signature éventuelle.
  if (!egal) {
    const { sujet, entrees } = lireUneSignature(dit);
    return { sujet, valeur: "", unite: "", entrees, regle: regle || entrees.length > 0 };
  }

  const lue = lireUneValeur(egal[2]);
  return { sujet: texte(egal[1]), valeur: lue.valeur, unite: lue.unite, entrees: [], regle };
}

/**
 * Un fichier entier : ses blocs, et ce qui n'a pas pu être lu.
 *
 * Un bloc s'ouvre sur une ligne non indentée et se ferme à la suivante. Il n'y
 * a pas d'autre délimiteur : l'indentation est la syntaxe, et une accolade
 * serait un mot de programmeur.
 *
 * @returns {{chemin: string, blocs: object[], refus: {ligne: number, texte: string, raison: string}[]}}
 */
export function lireUnFichier(contenu = "") {
  const lignes = String(contenu ?? "").split(/\r?\n/);
  const blocs = [];
  const refus = [];
  let chemin = "";
  let zone = "";
  let courant = null;

  const fermer = () => {
    if (courant) {
      // `accolade` sert à la lecture, pas au sens : elle ne ressort pas.
      const { accolade, ...bloc } = courant;
      blocs.push(bloc);
    }
    courant = null;
  };

  lignes.forEach((brute, rang) => {
    const numero = rang + 1;
    const { ferme, ouvre, corps } = bornesDe(brute);
    if (!corps && !ferme) return;

    // Une accolade seule ferme ce qui est ouvert : le bloc courant s'il y en a
    // un, la zone sinon. On ne la refuse jamais — une borne en trop est une
    // faute d'écriture, pas une perte de sens.
    if (ferme) {
      if (courant) fermer();
      else zone = "";
      return;
    }

    const { mot, reste } = teteDe(corps);

    if (mot === "fichier:") { fermer(); chemin = reste; return; }
    // Une note ne porte jamais de sens : elle ne rouvre ni ne ferme rien.
    if (mot === "note:") return;

    if (mot === "zone:") { fermer(); zone = reste; return; }

    // Une ligne qui **ouvre** ferme celle qui l'était : deux blocs ne
    // s'emboîtent pas. Sans cette règle, un bloc dont l'accolade fermante
    // manque avalait le suivant, puis l'accolade de la zone fermait ce bloc-là
    // au lieu de la zone — une borne oubliée dérangeait tout le fichier.
    if (ouvre && courant) fermer();

    // Un bloc ouvert **sans** accolade se ferme à la première ligne non
    // indentée : c'est l'ancienne règle, et elle reste, parce qu'un architecte
    // qui tape à la main n'ajoutera pas toujours ses bornes.
    if (courant && !courant.accolade && retraitDe(brute) === 0) fermer();

    if (!courant) {
      const tete = lireUneTete(corps);
      if (!tete?.sujet) {
        refus.push({ ligne: numero, texte: corps, raison: "cette ligne n'ouvre aucune donnée." });
        return;
      }
      courant = {
        sujet: tete.sujet, valeur: tete.valeur, unite: tete.unite, zone,
        accolade: ouvre,
        conditions: [], alors: "", sinon: "", sauf: [],
        provenance: null, preuve: "", statut: "", le: ""
      };
      return;
    }

    // Le mot-clé de provenance **est** son type : `texte:`, `document:`, `calcul:`…
    const type = mot.endsWith(":") ? mot.slice(0, -1) : "";
    if (PROVENANCES.includes(type)) {
      courant.provenance = { type, quoi: reste };
      return;
    }

    if (mot === "parce que:") { courant.preuve = lireUneValeur(reste).valeur; return; }

    if (mot === "le:") { courant.le = reste; return; }

    if (mot === "statut:") {
      const etat = reste.toLowerCase();
      if (!STATUTS.includes(etat)) {
        refus.push({ ligne: numero, texte: corps, raison: `« ${etat} » n'est pas un statut connu.` });
        return;
      }
      courant.statut = etat;
      return;
    }

    if (mot === "alors" || mot === "sinon") {
      const lue = lireUneValeur(sansBornes(reste).corps);
      courant[mot] = lue.unite ? `${lue.valeur} ${lue.unite}` : lue.valeur;
      return;
    }

    if (mot === "si" || mot === "et" || mot === "ou" || mot === "non" || mot === "sauf si") {
      const condition = lireUneCondition(sansBornes(reste).corps);
      if (!condition) {
        refus.push({ ligne: numero, texte: corps, raison: "cette condition ne compare rien." });
        return;
      }
      if (mot === "sauf si") courant.sauf.push(condition);
      else if (mot === "si") courant.conditions.push(condition);
      else courant.conditions.push({ ...condition, joint: mot });
      return;
    }

    // Un mot-clé en deux points qu'on ne connaît pas est presque toujours une
    // provenance mal orthographiée : le dire aide plus que « mot inconnu ».
    if (mot.endsWith(":") || /^[^\s:]+:\s/.test(corps)) {
      const propose = mot.endsWith(":") ? mot.slice(0, -1) : corps.split(":")[0];
      refus.push({ ligne: numero, texte: corps, raison: `« ${propose} » n'est pas une provenance connue.` });
      return;
    }

    refus.push({ ligne: numero, texte: corps, raison: "aucun mot de la langue n'ouvre cette ligne." });
  });

  fermer();
  return { chemin, blocs, refus };
}

/**
 * Ce dont un bloc dépend : les sujets de ses conditions, et rien d'autre.
 *
 * C'est ce qui remplace l'ancien `dépend de` écrit à la main. Une dépendance
 * calculée ne peut pas diverger de la règle dont elle sort, alors qu'une
 * dépendance recopiée diverge le jour où quelqu'un modifie la règle sans y
 * penser.
 */
export function dependancesDuBloc(bloc = {}) {
  const sujets = [
    ...(bloc?.conditions ?? []).map((condition) => texte(condition?.sujet)),
    ...(bloc?.sauf ?? []).map((condition) => texte(condition?.sujet))
  ].filter(Boolean);

  return [...new Set(sujets)];
}

/**
 * Le graphe d'un jeu de blocs : qui a besoin de quoi.
 *
 * Un sujet qu'aucun bloc ne produit est une **entrée** : c'est ce qu'il faudra
 * demander, ou lire dans un document. Les compter, c'est mesurer ce qu'un
 * référentiel coûte à celui qui l'utilise.
 */
export function grapheDesBlocs(blocs = []) {
  const liste = Array.isArray(blocs) ? blocs : [];
  const produits = new Set(liste.map((bloc) => texte(bloc?.sujet)).filter(Boolean));
  const liens = [];
  const entrees = new Set();

  for (const bloc of liste) {
    const vers = texte(bloc?.sujet);
    for (const socle of dependancesDuBloc(bloc)) {
      liens.push({ de: socle, vers });
      if (!produits.has(socle)) entrees.add(socle);
    }
  }

  return { produits: [...produits], liens, entrees: [...entrees].sort() };
}

/**
 * Ce qu'il faut revérifier quand une donnée change.
 *
 * C'est la question à laquelle cette mémoire existe pour répondre : « la
 * hauteur passe de 26 à 28,40 m, qu'est-ce qui tombe ? ». On descend le graphe,
 * ce qui dépend d'elle, puis ce qui dépend de cela.
 *
 * Un cycle ne fait pas boucler : un sujet déjà vu ne se reparcourt pas. Un
 * corpus circulaire est possible, et une page qui gèle est pire qu'une réponse
 * incomplète.
 */
export function aRevoirSi(sujet = "", blocs = []) {
  const { liens } = grapheDesBlocs(blocs);
  const depuis = new Map();
  for (const lien of liens) {
    if (!depuis.has(lien.de)) depuis.set(lien.de, []);
    depuis.get(lien.de).push(lien.vers);
  }

  const touches = [];
  const vus = new Set([texte(sujet)]);
  const file = [texte(sujet)];
  while (file.length) {
    for (const suivant of depuis.get(file.shift()) ?? []) {
      if (vus.has(suivant)) continue;
      vus.add(suivant);
      touches.push(suivant);
      file.push(suivant);
    }
  }

  return touches;
}

/**
 * Une ligne de texte, recolorée.
 *
 * ## Pourquoi elle passe par la lecture
 *
 * Le diff garde ses lignes en texte, parce que c'est ainsi qu'il les compare :
 * deux chaînes égales sont deux lignes inchangées, et rien de plus subtil n'est
 * nécessaire. Mais l'écran doit les **colorer**, et pour colorer il faut savoir
 * de quelle espèce est chaque morceau.
 *
 * On relit donc la ligne, et on la réécrit. `lire(écrire(G)) = G` garantit que
 * rien ne se perd au passage — c'est exactement à cela que sert cette loi. La
 * seule autre solution serait de transporter les jetons à côté du texte, et
 * deux représentations de la même ligne finiraient par diverger.
 *
 * @returns {{type: string, texte: string}[]}
 */
export function jetonsDeLaLigne(ligne = "") {
  const brute = String(ligne ?? "");
  const blancs = (brute.match(/^[\t ]*/) ?? [""])[0];
  const nu = texte(brute);
  if (!nu) return [];

  const marge = blancs ? [{ type: JETON.NEUTRE, texte: blancs }] : [];
  const { mot, reste } = teteDe(nu);

  const type = mot.endsWith(":") ? mot.slice(0, -1) : "";
  if (PROVENANCES.includes(type)) {
    return [...marge, ...(ligneDeProvenance({ type, quoi: reste }, 0) ?? []).slice(1)];
  }

  if (mot === "fichier:") return [...marge, ...ligneDeSectionLue(reste)];
  if (mot === "note:") return [...marge, ...ligneDeNote(reste)];
  if (mot === "parce que:") return [...marge, ...(ligneDePreuve(lireUneValeur(reste).valeur, 0) ?? []).slice(1)];
  if (mot === "statut:") return [...marge, ...(ligneDeStatut(reste, 0) ?? []).slice(1)];
  if (mot === "le:") return [...marge, ...(ligneDeDate(reste, 0) ?? []).slice(1)];

  if (mot === "alors" || mot === "sinon") {
    // Les bornes disent que la ligne vient d'un `.ref` : on les retire pour
    // lire et on les remet pour écrire, à l'identique.
    const { corps, borne } = sansBornes(reste);
    const lue = lireUneValeur(corps);
    return [...marge, ...ligneDeConsequence(mot, lue.valeur, lue.unite, 0, { regle: borne }).slice(1)];
  }

  if (mot === "si" || mot === "et" || mot === "ou" || mot === "non" || mot === "sauf si") {
    const { corps, borne } = sansBornes(reste);
    const condition = lireUneCondition(corps);
    if (condition) return [...marge, ...ligneDeCondition(mot, condition, 0, { regle: borne }).slice(1)];
  }

  // Une tête de bloc : une affirmation, ou une règle avec sa signature.
  const tete = lireUneTete(nu);
  if (tete?.regle) return [...marge, ...ligneDeDonnee(tete.sujet, tete.entrees, { regle: /^fonction\s/i.test(nu) })];
  if (tete?.entrees?.length) return [...marge, ...ligneDeDonnee(tete.sujet, tete.entrees)];
  if (tete?.valeur) return [...marge, ...ligneDAffirmation({ sujet: tete.sujet, valeur: tete.valeur, unite: tete.unite })];
  if (tete?.sujet) return [...marge, ...ligneDeDonnee(tete.sujet)];

  // Ce qu'on ne sait pas lire s'affiche tel quel, sans couleur. Le taire serait
  // pire : la ligne existe, et elle doit rester lisible.
  return [...marge, { type: JETON.NEUTRE, texte: nu }];
}

/** `fichier: …` — le chemin se colore comme une section. */
function ligneDeSectionLue(chemin) {
  return [
    { type: JETON.MOT_FICHIER, texte: "fichier:" },
    { type: JETON.NEUTRE, texte: " " },
    { type: JETON.SECTION, texte: texte(chemin) }
  ];
}
