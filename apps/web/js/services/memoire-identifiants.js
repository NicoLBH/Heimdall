/**
 * Ce que les noms désignent, et ce qu'ils ne désignent pas.
 *
 * ## Le problème
 *
 * Une règle écrit `si Hauteur du plancher bas <= 28 m`. Ce nom renvoie-t-il à
 * quelque chose ? À une donnée de base relevée sur un plan, à une valeur qu'une
 * autre règle produit — ou à rien du tout, parce qu'il a été mal orthographié,
 * ou parce que la donnée n'a jamais été versée ?
 *
 * Aujourd'hui, rien ne le dit. Trente règles peuvent pointer vers des données
 * que personne n'a déclarées, et le fichier se lit exactement comme s'il tenait
 * debout. C'est le pire des états : un raisonnement **incomplet** qui a l'air
 * complet.
 *
 * ## Deux rôles pour un même nom
 *
 * Un sujet est tantôt **déclaré** — c'est la tête d'un bloc, qui pose une
 * valeur ou produit un résultat —, tantôt **cité** : il apparaît dans une
 * condition, ou dans les entrées d'une règle. Le premier est une définition, le
 * second un renvoi ; un renvoi qui ne mène nulle part est une faute, une
 * définition ne peut pas l'être.
 *
 * C'est exactement ce qu'un éditeur de code fait d'une variable, et c'est pour
 * cela que la distinction vaut la peine : elle transforme la mémoire en quelque
 * chose qui se **vérifie** en la lisant.
 *
 * ## Pourquoi une clé normalisée
 *
 * « Hauteur du plancher bas » et « hauteur du plancher  bas » sont le même
 * sujet écrit deux fois. Comparer les libellés bruts ferait déclarer inconnu ce
 * qui est parfaitement connu, à une majuscule près — et le remède serait pire
 * que le mal : on n'oserait plus se fier à la couleur.
 *
 * On ne va pas plus loin que la casse, les accents et les espaces. Rapprocher
 * « hauteur » de « hauteurs » demanderait de deviner, et deviner ici ferait
 * passer pour résolu un renvoi qui ne l'est pas.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une ligne fait d'un nom. */
export const ROLE = {
  /** La tête d'un bloc : elle pose le nom. */
  DECLARATION: "declaration",
  /** Une condition, ou une entrée de règle : elle y renvoie. */
  RENVOI: "renvoi"
};

/** Ce qu'un renvoi vaut, une fois cherché. */
export const RESOLUTION = {
  DECLARATION: "declaration",
  CONNU: "connu",
  INCONNU: "inconnu"
};

/**
 * La clé d'un sujet : ce par quoi deux écritures du même nom se rejoignent.
 *
 * Casse, accents et espaces multiples, rien de plus. Voir l'en-tête : deviner
 * au-delà ferait passer pour résolu ce qui ne l'est pas.
 */
export function cleDuSujet(sujet) {
  return texte(sujet)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Les sujets que la mémoire déclare.
 *
 * Un bloc déclare son sujet, quelle que soit sa nature : une donnée de base le
 * pose, une règle le produit, une contrainte l'impose. Ce qui compte pour un
 * renvoi, c'est qu'**il existe quelque part** — pas la façon dont il existe.
 *
 * Ce qui a été remplacé ne déclare plus rien : la ligne n'est plus l'état, et
 * un renvoi vers elle renverrait vers ce que le projet ne tient plus pour vrai.
 *
 * @returns {Set<string>} les clés déclarées
 */
export function sujetsDeclares(assertions = []) {
  const declares = new Set();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (texte(assertion?.superseded_by)) continue;

    const sujet = texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
    const cle = cleDuSujet(sujet);
    if (cle) declares.add(cle);
  }

  return declares;
}

/**
 * Le rôle que joue un nom sur cette ligne.
 *
 * C'est le **premier mot** qui tranche : une ligne qui commence par `si`, `et`,
 * `ou` ou `sauf si` pose une condition, donc renvoie ; toute autre ligne qui
 * porte un sujet le déclare.
 *
 * On le lit sur les jetons plutôt que sur une étiquette posée ailleurs : c'est
 * la grammaire qui le dit, et une étiquette de plus finirait par ne plus
 * s'accorder avec ce que la ligne contient réellement.
 */
export function roleDesJetons(jetons = []) {
  const premier = (Array.isArray(jetons) ? jetons : []).find((jeton) => jeton?.type && jeton.type !== "neutre");
  const mot = texte(premier?.type);
  return mot === "mot-condition" || mot === "mot-exception" ? ROLE.RENVOI : ROLE.DECLARATION;
}

/**
 * Ce qu'un nom vaut, sur cette ligne, dans cette mémoire.
 *
 * Une déclaration ne se résout pas : elle **est** la résolution. Un renvoi se
 * cherche, et son absence se dit — c'est tout l'intérêt.
 *
 * @returns {""|"declaration"|"connu"|"inconnu"}
 */
export function resolutionDuSujet(sujet, { jetons = [], declares = null } = {}) {
  const cle = cleDuSujet(sujet);
  if (!cle) return "";

  if (roleDesJetons(jetons) === ROLE.DECLARATION) return RESOLUTION.DECLARATION;
  // Sans table de déclarations, on ne sait pas : on ne dit donc rien. Marquer
  // tout comme inconnu ferait un fichier rouge de bout en bout, qui
  // n'apprendrait rien à personne.
  if (!declares) return "";

  return declares.has(cle) ? RESOLUTION.CONNU : RESOLUTION.INCONNU;
}

/**
 * Les renvois d'un fichier qui ne mènent nulle part.
 *
 * De quoi dire, en tête d'un fichier : « trois de ses conditions portent sur
 * des données que personne n'a versées ». C'est la question qu'on se pose
 * devant un raisonnement, et la seule à laquelle un fichier de règles ne
 * savait pas répondre.
 *
 * @param {({jetons: object[]}|object[])[]} lignes des lignes, ou des jetons
 * @returns {string[]} les sujets cités et introuvables, sans doublon
 */
export function renvoisSansDeclaration(lignes = [], declares = null) {
  if (!declares) return [];

  const manquants = new Map();

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const jetons = ligne?.jetons ?? ligne;
    if (roleDesJetons(jetons) !== ROLE.RENVOI) continue;

    for (const jeton of jetons ?? []) {
      if (jeton?.type !== "sujet") continue;
      const cle = cleDuSujet(jeton.texte);
      if (cle && !declares.has(cle) && !manquants.has(cle)) manquants.set(cle, texte(jeton.texte));
    }
  }

  return [...manquants.values()];
}
