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
 * ## Ce fichier ne connaît ni l'écran ni la mémoire
 *
 * Il reçoit des lignes de texte et rend des positions. C'est ce qui permet de
 * s'en servir aux deux endroits — dans un fichier ouvert et dans les résultats
 * du projet — sans que les deux se mettent à chercher différemment.
 */

const texte = (valeur) => String(valeur ?? "").trim();

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
 * Les mots d'une recherche, pliés et sans doublon.
 *
 * Une recherche porte souvent plusieurs mots — « Résultat du calcul des
 * fondations superficielles ». Les traiter comme **une seule chaîne** revient à
 * n'accepter que la phrase exacte, dans cet ordre, sur une seule ligne : c'est
 * ce que faisait la recherche d'un fichier, et c'est pourquoi elle ne trouvait
 * rien alors que la recherche du projet trouvait.
 *
 * Les deux emploient maintenant la même découpe.
 */
export function motsDeLaRecherche(quoi) {
  return [...new Set(pourChercher(quoi).split(/\s+/).filter(Boolean))];
}

/**
 * Les endroits d'une chaîne où les mots cherchés apparaissent.
 *
 * Rendus sur la chaîne **d'origine** : on compare sur la forme pliée, on
 * découpe sur la vraie. Sans cela, un texte accentué se recomposerait sans ses
 * accents, et l'écran montrerait autre chose que le fichier.
 *
 * Les places se **fusionnent** quand elles se touchent : « calcul » et « des »
 * cherchés ensemble dans « calcul des fondations » donnent un seul surlignage,
 * pas deux marques séparées par un blanc surligné à moitié.
 *
 * @returns {{debut: number, fin: number}[]} triées, sans chevauchement
 */
export function placesDuMot(chaine, mot) {
  const mots = motsDeLaRecherche(mot);
  if (!mots.length) return [];

  const dans = pourChercher(chaine);
  const brutes = [];

  for (const cherche of mots) {
    let depuis = dans.indexOf(cherche);
    while (depuis !== -1) {
      brutes.push({ debut: depuis, fin: depuis + cherche.length });
      depuis = dans.indexOf(cherche, depuis + Math.max(1, cherche.length));
    }
  }

  brutes.sort((gauche, droite) => gauche.debut - droite.debut || gauche.fin - droite.fin);

  const places = [];
  for (const place of brutes) {
    const dernier = places.at(-1);
    // Deux places se rejoignent quand elles se touchent, ou quand il n'y a
    // qu'un blanc entre elles : chercher « calcul des » doit marquer
    // « calcul des » d'un trait, et non deux mots autour d'un espace nu.
    const colle = dernier
      && (place.debut <= dernier.fin || !dans.slice(dernier.fin, place.debut).trim());

    if (colle) dernier.fin = Math.max(dernier.fin, place.fin);
    else places.push({ ...place });
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
 * Les rangs des lignes qui portent le mot, dans l'ordre du fichier.
 *
 * On cherche sur le **texte affiché** de la ligne, pas sur ce que la mémoire
 * porte derrière : c'est ce que le lecteur voit, et c'est donc ce qu'il croit
 * chercher.
 *
 * @param {{rang: number, clair: string}[]} lignes
 * @returns {number[]} les rangs, sans doublon
 */
export function lignesQuiPortent(lignes = [], mot) {
  const mots = motsDeLaRecherche(mot);
  if (!mots.length) return [];

  // **Tous** les mots, dans n'importe quel ordre — la même règle que la
  // recherche du projet. Exiger la phrase exacte ferait trouver dans la liste
  // des résultats ce qu'on ne retrouverait pas en ouvrant le fichier, et le
  // clic depuis un résultat ne menait alors nulle part.
  return (Array.isArray(lignes) ? lignes : [])
    .filter((ligne) => {
      const clair = pourChercher(ligne?.clair);
      return mots.every((cherche) => clair.includes(cherche));
    })
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
