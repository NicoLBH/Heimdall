/**
 * Ce qu'un modèle a le droit d'écrire au-dessus d'une proposition.
 *
 * ## Le défaut qu'on ferme
 *
 * Vingt-cinq propositions intitulées « Fondations superficielles —
 * dimensionnement ». Six mois plus tard la liste ne dit plus rien, et retrouver
 * *la* proposition qui a descendu les massifs demande de les ouvrir une à une.
 * Ce qu'on veut lire : « Massifs du bâtiment A descendus à 0,66 m après relevé
 * d'altitude ».
 *
 * ## Pourquoi un modèle ici, alors qu'ailleurs on s'en passe
 *
 * `proposition-title.js` nomme un lot de documents **sans** modèle, et le dit :
 * « faire appeler un LLM pour assembler trois nombres serait payer cher une
 * phrase qu'on sait écrire ». C'est vrai là-bas — trois natures, un émetteur,
 * une période, la phrase s'assemble.
 *
 * Ici, non. Ce qui distingue deux propositions d'affirmations n'est pas
 * dénombrable : c'est **ce qui a changé et pourquoi cela compte**, et cela ne
 * s'assemble pas à partir de quatre compteurs. La distinction tient, et les deux
 * chemins restent séparés.
 *
 * ## La règle, et pourquoi elle est **vérifiée** et non pas seulement demandée
 *
 * Un modèle ne produit ici **aucune valeur** : il redit ce que le diff contient.
 * Un chiffre qui viendrait de lui serait indiscernable des autres à l'écran —
 * un titre qui annonce « descendus à 0,60 m » quand le diff dit 0,66 se lit
 * comme une donnée du projet, et personne ne va vérifier un titre.
 *
 * L'écrire dans la consigne ne suffit pas : une consigne est un vœu. Ce fichier
 * la **contrôle**. Tout nombre présent dans ce que le modèle rend doit se
 * retrouver dans ce qu'on lui a donné, sans quoi la rédaction est refusée
 * entière et l'appelant reprend son titre d'origine — en disant pourquoi.
 *
 * C'est la même discipline que la cloison ou les domiciles de noms : on ne
 * demande pas au code de bien se tenir, on casse quand il ne se tient pas.
 *
 * ## Pourquoi comparer des nombres, et pas des chaînes
 *
 * « 0,66 » et « 0.66 » sont la même cote écrite deux fois. Comparer le texte
 * refuserait une rédaction juste ; comparer les nombres l'accepte. À l'inverse,
 * « 66 » n'est pas « 0,66 » — un modèle qui perd la virgule doit être refusé,
 * et c'est exactement ce qu'une comparaison numérique fait.
 *
 * Les mots en toutes lettres — « trois massifs » — passent sans contrôle. C'est
 * assumé : un nombre écrit en lettres ne se lit pas comme une donnée du projet,
 * et aucune cote ne s'écrit ainsi dans une note de calcul.
 */

/** Au-delà, ce n'est plus un titre : c'est le résumé, qui a sa propre place. */
export const TAILLE_MAX_TITRE = 120;

/** Au-delà, ce n'est plus un résumé : c'est la proposition elle-même. */
export const TAILLE_MAX_RESUME = 600;

/** Pourquoi une rédaction a été écartée. L'appelant l'affiche tel quel. */
export const REFUS = {
  VIDE: "vide",
  INVENTE: "valeur-inventee",
  TROP_LONG: "trop-long",
  ILLISIBLE: "illisible"
};

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les nombres d'un texte, sous une forme comparable.
 *
 * Un nombre est une suite de chiffres, éventuellement décimale — virgule ou
 * point, les deux s'écrivent. Les espaces de milliers sont recousus : « 1 200 »
 * est un nombre, pas deux.
 *
 * Le rendu est la valeur numérique en chaîne, ce qui fait tomber d'elles-mêmes
 * les écritures équivalentes : `0,66`, `0.66` et `.66` donnent tous `0.66`.
 */
export function nombresDuTexte(valeur = "") {
  const dit = String(valeur ?? "")
    // Les espaces de milliers, y compris l'insécable et l'insécable fine, que
    // les rédactions françaises emploient — et qui couperaient le nombre en deux.
    .replace(/(\d)[   ](?=\d{3}\b)/g, "$1");

  const trouves = dit.match(/\d+(?:[.,]\d+)?|[.,]\d+/g) ?? [];

  return new Set(
    trouves
      .map((brut) => Number(brut.replace(",", ".")))
      .filter((nombre) => Number.isFinite(nombre))
      .map((nombre) => String(nombre))
  );
}

/**
 * Les nombres que le modèle a produits et qu'on ne lui avait pas donnés.
 *
 * `faits` est ce qu'on lui a envoyé, tel quel : on y cherche les nombres sans
 * savoir dans quel champ ils se trouvaient. Un titre qui reprend une cote la
 * reprend d'une valeur, d'un sujet ou d'une zone — la distinction n'a pas
 * d'importance ici, seule compte la présence.
 *
 * @returns {string[]} triés, pour que le message de refus soit stable
 */
export function valeursInventees(rendu = "", faits = "") {
  const donnes = nombresDuTexte(typeof faits === "string" ? faits : JSON.stringify(faits ?? ""));
  return [...nombresDuTexte(rendu)].filter((nombre) => !donnes.has(nombre)).sort();
}

/**
 * Ce que le modèle a rendu, lu comme un objet.
 *
 * On demande du JSON, et l'on reçoit parfois du JSON dans une clôture de code —
 * c'est une habitude des modèles, pas une faute de celui-ci en particulier. La
 * retirer coûte deux lignes ; laisser l'appel échouer dessus coûterait un titre.
 *
 * Ce qui n'est pas lisible rend `null`, jamais un objet vide : un objet vide se
 * confondrait avec une réponse dont les champs sont vides, et les deux ne se
 * traitent pas pareil.
 */
export function redactionDuTexte(brut = "") {
  const dit = texte(brut).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (!dit) return null;

  try {
    const lu = JSON.parse(dit);
    return lu && typeof lu === "object" && !Array.isArray(lu) ? lu : null;
  } catch {
    return null;
  }
}

/**
 * La rédaction, si elle est recevable ; le refus et sa raison sinon.
 *
 * Refusée **entière**, jamais rapiécée : garder le titre et jeter le résumé
 * laisserait la moitié d'une rédaction qu'on vient de juger fausse, et personne
 * ne saurait laquelle.
 *
 * @param {{titre?: string, resume?: string}} rendu ce que le modèle a écrit
 * @param {string|object} faits ce qu'on lui avait donné
 * @returns {{ok: true, titre: string, resume: string}
 *   |{ok: false, refus: string, valeurs?: string[]}}
 */
export function redactionRecevable(rendu = {}, faits = "") {
  const titre = texte(rendu?.titre);
  const resume = texte(rendu?.resume);

  // Un titre vide n'est pas une rédaction courte : c'est une absence de
  // réponse, et elle ne doit pas remplacer le titre d'origine.
  if (!titre) return { ok: false, refus: REFUS.VIDE };

  if (titre.length > TAILLE_MAX_TITRE || resume.length > TAILLE_MAX_RESUME) {
    return { ok: false, refus: REFUS.TROP_LONG };
  }

  const inventees = valeursInventees(`${titre}\n${resume}`, faits);
  if (inventees.length) return { ok: false, refus: REFUS.INVENTE, valeurs: inventees };

  return { ok: true, titre, resume };
}
