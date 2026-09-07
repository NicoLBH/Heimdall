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

import { OPERATEUR, PROVENANCES, STATUTS, RETRAIT } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les comparateurs, écrits comme on veut.
 *
 * Un architecte tapera `<=` parce que c'est sur son clavier ; l'écriture rend
 * `≤` parce que c'est ce qu'on lit dans un CCTP. Les deux mènent au même
 * endroit.
 */
const COMPARATEURS = new Map([
  ["=", OPERATEUR.EGAL],
  ["==", OPERATEUR.EGAL],
  ["≠", OPERATEUR.DIFFERENT],
  ["!=", OPERATEUR.DIFFERENT],
  ["<>", OPERATEUR.DIFFERENT],
  ["≤", OPERATEUR.AU_PLUS],
  ["<=", OPERATEUR.AU_PLUS],
  ["≥", OPERATEUR.AU_MOINS],
  [">=", OPERATEUR.AU_MOINS],
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

/** Les mots de tête, du plus long au plus court : « sauf si » avant « si ». */
const TETES = ["sauf si", "parce que", "statut", "alors", "sinon", "si", "et", "ou", "non"];

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
  const dit = texte(ligne);
  if (!dit) return null;

  let corps = dit;
  let zones = [];
  const portee = corps.match(/^(.*?)\s+@\s*(.+)$/);
  if (portee) {
    corps = texte(portee[1]);
    zones = portee[2].split(",").map(texte).filter(Boolean);
  }

  const egal = corps.match(/^(.*?)\s*=\s*(.*)$/);
  if (!egal) return { sujet: corps, valeur: "", unite: "", zones };

  const lue = lireUneValeur(egal[2]);
  return { sujet: texte(egal[1]), valeur: lue.valeur, unite: lue.unite, zones };
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
  let courant = null;

  const fermer = () => { if (courant) blocs.push(courant); courant = null; };

  lignes.forEach((brute, rang) => {
    const numero = rang + 1;
    const nu = texte(brute);
    if (!nu) return;

    if (nu.startsWith("§")) { fermer(); chemin = texte(nu.slice(1)); return; }
    // Une note ne porte jamais de sens : elle ne rouvre ni ne ferme rien.
    if (nu.startsWith("¶")) return;

    if (retraitDe(brute) === 0) {
      fermer();
      const tete = lireUneTete(nu);
      if (!tete?.sujet) {
        refus.push({ ligne: numero, texte: nu, raison: "cette ligne n'ouvre aucune donnée." });
        return;
      }
      courant = {
        ...tete, conditions: [], alors: "", sinon: "", sauf: [],
        provenance: null, preuve: "", statut: ""
      };
      return;
    }

    if (!courant) {
      refus.push({ ligne: numero, texte: nu, raison: "cette ligne est indentée sous rien." });
      return;
    }

    if (nu.startsWith("←")) {
      const suite = texte(nu.slice(1));
      const coupe = suite.indexOf(" ");
      const type = coupe === -1 ? suite : suite.slice(0, coupe);
      if (!PROVENANCES.includes(type)) {
        refus.push({ ligne: numero, texte: nu, raison: `« ${type} » n'est pas une provenance connue.` });
        return;
      }
      courant.provenance = { type, quoi: coupe === -1 ? "" : texte(suite.slice(coupe)) };
      return;
    }

    const { mot, reste } = teteDe(nu);

    if (mot === "parce que") { courant.preuve = lireUneValeur(reste).valeur; return; }

    if (mot === "statut") {
      const etat = texte(reste).toLowerCase();
      if (!STATUTS.includes(etat)) {
        refus.push({ ligne: numero, texte: nu, raison: `« ${etat} » n'est pas un statut connu.` });
        return;
      }
      courant.statut = etat;
      return;
    }

    if (mot === "alors" || mot === "sinon") {
      const lue = lireUneValeur(reste);
      courant[mot] = lue.unite ? `${lue.valeur} ${lue.unite}` : lue.valeur;
      return;
    }

    if (mot === "si" || mot === "et" || mot === "ou" || mot === "non" || mot === "sauf si") {
      const condition = lireUneCondition(reste);
      if (!condition) {
        refus.push({ ligne: numero, texte: nu, raison: "cette condition ne compare rien." });
        return;
      }
      if (mot === "sauf si") courant.sauf.push(condition);
      else if (mot === "si") courant.conditions.push(condition);
      else courant.conditions.push({ ...condition, joint: mot });
      return;
    }

    refus.push({ ligne: numero, texte: nu, raison: "aucun mot de la langue n'ouvre cette ligne." });
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
