/**
 * Chercher un mot dans un texte de la mémoire — et le montrer où il est.
 *
 * ## Trouver ne suffit pas
 *
 * La recherche du projet disait quels fichiers portent un mot, et affichait la
 * ligne. Trois choses manquaient, et chacune faisait retomber le travail sur le
 * lecteur :
 *
 * - **le mot n'était pas visible dans la ligne.** Sur une ligne de cent
 *   caractères, on relisait tout pour trouver ce qu'on venait de chercher ;
 * - **la ligne était seule.** Une condition sans la règle qui la porte, une
 *   valeur sans son sujet : on voyait la réponse sans la question ;
 * - **on ne pouvait pas y aller.** Il fallait retrouver le fichier à la main,
 *   l'ouvrir, et faire défiler.
 *
 * Et **dans** un fichier, il n'y avait rien du tout : `variables-du-projet.ref`
 * fait dix-sept cents lignes, et la seule façon d'y chercher un nom était de
 * lire.
 *
 * ## On cherche une expression, pas un sac de mots
 *
 * « Résultat du calcul des fondations superficielles » désigne **une** chose. La
 * découper en mots et rendre tout ce qui en porte un — ou deux, ou trois, dans
 * n'importe quel ordre — rendait des dizaines de lignes qu'on n'avait pas
 * demandées. La phrase se cherche entière, dans son ordre ; seuls les blancs
 * sont souples.
 *
 * ## Ce fichier ne connaît ni l'écran ni la mémoire
 *
 * Il reçoit des lignes de texte et rend des positions. C'est ce qui permet de
 * s'en servir aux deux endroits — dans un fichier ouvert et dans les résultats
 * du projet — sans que les deux se mettent à chercher différemment.
 */

/**
 * Le texte, réduit à ce sur quoi on compare.
 *
 * Casse et accents pliés : on cherche « hors gel » et l'on trouve « Hors gel ».
 * Rien de plus — deviner au-delà ferait trouver ce qu'on n'a pas demandé.
 */
export function pourChercher(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Ce qu'on cherche : **la phrase**, blancs normalisés.
 *
 * ## Pourquoi la phrase, et pas les mots
 *
 * La version précédente découpait la recherche en mots et gardait les lignes qui
 * les portaient tous, dans n'importe quel ordre. Taper « Résultat du calcul des
 * fondations superficielles » rendait alors tout ce qui contient « calcul », ou
 * « des fondations », ou n'importe quel assemblage de ces mots — des dizaines de
 * lignes qu'on n'a pas demandées, dans lesquelles il fallait rechercher à l'œil
 * ce qu'on venait de chercher.
 *
 * Une recherche multi-mots est une **expression** : on cherche cette chose-là,
 * nommée par ces mots-là, dans cet ordre. C'est ce que fait tout éditeur, et
 * c'est ce qu'un lecteur attend. Chercher un seul mot reste possible — c'est
 * une phrase d'un mot.
 *
 * Les blancs se normalisent : deux espaces entre deux mots, ou une fin de ligne,
 * ne doivent pas empêcher de trouver. Ce qui est refusé, c'est l'ordre différent
 * et les mots absents.
 *
 * @returns {string} la phrase pliée, ou `""` s'il n'y a rien à chercher
 */
export function phraseCherchee(quoi) {
  return pourChercher(quoi).replace(/\s+/g, " ").trim();
}

/**
 * Les endroits d'une chaîne où la phrase cherchée apparaît.
 *
 * Rendus sur la chaîne **d'origine** : on compare sur la forme pliée, on
 * découpe sur la vraie. Sans cela, un texte accentué se recomposerait sans ses
 * accents, et l'écran montrerait autre chose que le fichier.
 *
 * Un blanc de la phrase accepte n'importe quel blanc du texte, et autant qu'il
 * y en a : c'est le seul écart toléré, et il ne change pas ce qu'on lit.
 *
 * @returns {{debut: number, fin: number}[]} triées, sans chevauchement
 */
export function placesDuMot(chaine, mot) {
  const phrase = phraseCherchee(mot);
  if (!phrase) return [];

  const dans = pourChercher(chaine);
  const places = [];

  // Les blancs de la phrase valent pour un ou plusieurs blancs du texte ; le
  // reste se cherche à la lettre. Échapper d'abord : une recherche qui contient
  // « ( » ou « . » — et le langage en est plein — deviendrait sans cela une
  // expression régulière qui trouve n'importe quoi.
  const motif = new RegExp(
    phrase.split(/\s+/).map((mot) => mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
    "g"
  );

  for (const trouve of dans.matchAll(motif)) {
    const debut = trouve.index;
    const fin = debut + trouve[0].length;
    const dernier = places.at(-1);
    if (dernier && debut <= dernier.fin) dernier.fin = Math.max(dernier.fin, fin);
    else places.push({ debut, fin });
  }

  return places;
}

/**
 * Une chaîne découpée en morceaux, ceux qui portent le mot étant marqués.
 *
 * C'est ce qu'un écran surligne. Le découpage se fait ici plutôt qu'au rendu :
 * deux écrans qui découperaient chacun à leur façon finiraient par surligner
 * deux choses différentes pour la même recherche.
 *
 * @returns {{texte: string, trouve: boolean}[]}
 */
export function morceauxSurlignes(chaine, mot) {
  const dit = String(chaine ?? "");
  const places = placesDuMot(dit, mot);
  if (!places.length) return dit ? [{ texte: dit, trouve: false }] : [];

  const morceaux = [];
  let curseur = 0;

  for (const place of places) {
    if (place.debut > curseur) morceaux.push({ texte: dit.slice(curseur, place.debut), trouve: false });
    morceaux.push({ texte: dit.slice(place.debut, place.fin), trouve: true });
    curseur = place.fin;
  }
  if (curseur < dit.length) morceaux.push({ texte: dit.slice(curseur), trouve: false });

  return morceaux;
}

/**
 * Une ligne porte-t-elle la phrase cherchée ?
 *
 * Un seul juge pour toute l'application : la recherche du projet et celle d'un
 * fichier ouvert répondent oui aux mêmes lignes. Elles en avaient deux, qui ont
 * fini par diverger — la liste des résultats montrait des lignes que le fichier
 * ouvert ne surlignait pas, et le clic depuis un résultat ne menait nulle part.
 */
export function porteLaPhrase(chaine, mot) {
  const phrase = phraseCherchee(mot);
  return Boolean(phrase) && placesDuMot(chaine, phrase).length > 0;
}

/**
 * Les rangs des lignes qui portent la phrase, dans l'ordre du fichier.
 *
 * On cherche sur le **texte affiché** de la ligne, pas sur ce que la mémoire
 * porte derrière : c'est ce que le lecteur voit, et c'est donc ce qu'il croit
 * chercher.
 *
 * @param {{rang: number, clair: string}[]} lignes
 * @returns {number[]} les rangs, sans doublon
 */
export function lignesQuiPortent(lignes = [], mot) {
  if (!phraseCherchee(mot)) return [];

  return (Array.isArray(lignes) ? lignes : [])
    .filter((ligne) => porteLaPhrase(ligne?.clair, mot))
    .map((ligne) => Number(ligne.rang))
    .filter((rang) => Number.isFinite(rang));
}

/**
 * Le rang suivant — ou précédent — parmi ceux qui portent le mot.
 *
 * La liste **boucle**, contrairement à ce que fait la navigation d'un tableau :
 * une recherche parcourt un ensemble, pas une suite. Arrivé au dernier, le
 * suivant est le premier — c'est ce que tout éditeur fait, et s'arrêter sans le
 * dire ferait croire qu'il n'y en a plus.
 */
export function rangVoisin(rangs = [], courant, direction = 1) {
  const liste = (Array.isArray(rangs) ? rangs : []).filter((rang) => Number.isFinite(rang));
  if (!liste.length) return null;

  const place = liste.indexOf(Number(courant));
  if (place === -1) return direction > 0 ? liste[0] : liste[liste.length - 1];

  const suivant = (place + direction + liste.length) % liste.length;
  return liste[suivant];
}

/**
 * Une trouvaille, et les lignes qui l'entourent.
 *
 * ## Pourquoi le contexte
 *
 * Une ligne seule ne se comprend pas. `si (Hauteur ≤ 28 m)` ne dit pas de quelle
 * règle il s'agit ; `statut: retenu` ne dit pas ce qui est retenu. Deux ou trois
 * lignes au-dessus et au-dessous suffisent presque toujours, parce que
 * l'indentation du langage met la tête du bloc juste avant.
 *
 * On ne rend jamais deux fois la même ligne : deux trouvailles voisines
 * partagent leur contexte, et le répéter ferait lire deux fois le même passage
 * en croyant qu'il y en a deux.
 *
 * @param {{rang: number}[]} lignes toutes les lignes du fichier
 * @param {number[]} trouves les rangs qui portent le mot
 * @param {number} [marge] combien de lignes de part et d'autre
 * @returns {{rang: number, trouve: boolean}[][]} un groupe par passage
 */
export function passagesAutourDe(lignes = [], trouves = [], marge = 2) {
  const rangs = new Set((Array.isArray(trouves) ? trouves : []).map(Number));
  if (!rangs.size) return [];

  const parRang = new Map((Array.isArray(lignes) ? lignes : []).map((ligne) => [Number(ligne?.rang), ligne]));
  const gardees = new Set();
  for (const rang of rangs) {
    for (let autour = rang - marge; autour <= rang + marge; autour += 1) {
      if (parRang.has(autour)) gardees.add(autour);
    }
  }

  const ordonnees = [...gardees].sort((gauche, droite) => gauche - droite);
  const passages = [];
  let passage = [];

  for (const rang of ordonnees) {
    // Un trou dans la suite ferme le passage : deux extraits séparés par vingt
    // lignes ne sont pas un extrait de vingt-cinq lignes.
    if (passage.length && rang !== passage.at(-1).rang + 1) {
      passages.push(passage);
      passage = [];
    }
    passage.push({ ...parRang.get(rang), rang, trouve: rangs.has(rang) });
  }
  if (passage.length) passages.push(passage);

  return passages;
}
