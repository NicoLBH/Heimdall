/**
 * Les conditions de la branche empruntée, mises en clair.
 *
 * ## Pourquoi elles descendent maintenant
 *
 * Le corpus ne livrait que l'article et sa citation. Faute de conditions, le
 * fichier `.mdall` d'un projet les **fabriquait** à partir des valeurs conclues
 * en amont, et écrivait « si hauteur du plancher bas = 26 » là où l'arrêté dit
 * « au plus 28 m ». C'était faux, et de la pire façon : la ligne se lisait comme
 * une règle et se citait en réunion.
 *
 * Trois conséquences, dont la troisième décide :
 *
 * - une règle qui vaut pour un seul bâtiment ne capitalise rien ;
 * - le diff mentait dans les deux sens — il annonçait un changement de règle
 *   quand une cote du projet bougeait, et n'annonçait rien quand l'arrêté était
 *   modifié ;
 * - le graphe ne se reconstruisait pas depuis le texte : impossible de répondre
 *   « si la hauteur devient 22, qu'est-ce qui tombe ? » sans revenir au serveur.
 *
 * ## Ce que cela n'ouvre pas
 *
 * **La branche empruntée, et elle seule.** Les autres règles du module, l'ordre
 * dans lequel elles se lisent, les questions non posées et le catalogue complet
 * restent au serveur — c'est le dépouillement qui est le produit, pas l'arrêté,
 * qui est du droit public et dont la citation s'affiche déjà.
 *
 * Et rien de nouveau ne fuit : pour qu'une règle l'emporte, chacun de ses faits
 * devait être connu, donc soit posé en question à l'écran, soit produit par un
 * module amont déjà nommé dans le graphe. On ne publie ici aucun identifiant
 * que le navigateur n'ait déjà.
 */

/** Ce qu'un opérateur du moteur dit, dans les signes qu'on lit. */
const SIGNES = {
  auPlus: "≤",
  auMoins: "≥",
  plusDe: ">",
  moinsDe: "<",
  differentDe: "≠",
  parmi: "parmi"
};

/**
 * Une exigence portée sur un fait, rendue lisible.
 *
 * @returns {{operateur: string, valeur: unknown}[]} une exigence peut en porter
 *   plusieurs — `{ auMoins: 3, auPlus: 7 }` se lit « ≥ 3 » **et** « ≤ 7 »
 */
function comparaisonsDe(exigence) {
  if (exigence && typeof exigence === "object" && !Array.isArray(exigence) && "renseigne" in exigence) {
    return [{ operateur: exigence.renseigne ? "renseigné" : "non renseigné", valeur: null }];
  }

  if (Array.isArray(exigence)) return [{ operateur: "parmi", valeur: exigence.map(String) }];

  if (exigence && typeof exigence === "object") {
    return Object.entries(exigence).map(([operateur, borne]) => ({
      operateur: SIGNES[operateur] ?? operateur,
      valeur: operateur === "parmi" ? (borne ?? []).map(String) : borne
    }));
  }

  // Un booléen se lit « oui » ou « non » : `= true` demanderait de savoir ce
  // qu'est un booléen, et ce langage s'adresse à des architectes.
  if (typeof exigence === "boolean") return [{ operateur: "=", valeur: exigence ? "oui" : "non", logique: true }];

  return [{ operateur: "=", valeur: exigence }];
}

/**
 * Les conditions d'une règle, chacune nommée par son sujet.
 *
 * Le sujet vient du module qui produit le fait quand il y en a un, sinon de la
 * question qui le pose. Une question porte deux formes : son `libelle`, qui est
 * une phrase interrogative faite pour être posée, et son `sujet`, qui est le
 * nom court sous lequel la réponse se relit. C'est le second qu'on écrit ici —
 * « si Le bâtiment comporte-t-il des logements superposés ? = oui » ne se lit
 * pas.
 *
 * @param {object} si la clause `si` de la règle gagnante
 * @param {Map<string, string>} sujets fait → nom court
 */
export function conditionsMontrables(si = {}, sujets = new Map(), unites = new Map()) {
  const conditions = [];

  for (const [fait, exigence] of Object.entries(si ?? {})) {
    for (const comparaison of comparaisonsDe(exigence)) {
      conditions.push({
        fait,
        sujet: sujets.get(fait) ?? fait,
        operateur: comparaison.operateur,
        valeur: comparaison.valeur,
        // « ≤ 28 » et « ≤ 28 m » ne se relisent pas pareil : un seuil sans son
        // unité oblige à retourner au texte pour savoir de quoi on parle.
        unite: unites.get(fait) ?? null,
        // Oui / non n'est pas une valeur textuelle : elle ne prend pas de
        // guillemets, et l'écriture doit pouvoir faire la différence.
        logique: comparaison.logique === true
      });
    }
  }

  return conditions;
}

/**
 * Le nom court de chaque fait : celui du module qui le produit, sinon celui de
 * la question qui le pose.
 *
 * Un fait produit **et** demandé n'existe pas — un module qui produit un fait
 * en est le seul producteur, et la question n'existerait pas. La priorité au
 * module est donc sans effet ; elle dit seulement l'ordre dans lequel on
 * cherche.
 */
/**
 * L'unité de chaque fait mesuré, qu'il vienne d'une question ou d'un module.
 *
 * Un seuil sans unité — « ≤ 28 » — oblige à rouvrir l'arrêté pour savoir s'il
 * s'agit de mètres, d'étages ou de minutes. Un fait qui n'en a pas est un fait
 * qui se compte : le nombre d'étages n'a pas d'unité, et lui en inventer une
 * serait pire que de n'en pas mettre.
 */
export function unitesDesFaits(questions = [], corpus = []) {
  const unites = new Map();
  for (const question of questions) {
    if (question?.cle && question.unite) unites.set(question.cle, question.unite);
  }
  for (const module of corpus) {
    if (module?.produit && module.unite) unites.set(module.produit, module.unite);
  }
  return unites;
}

export function sujetsDesFaits(corpus = [], questions = []) {
  const sujets = new Map();
  for (const question of questions) {
    if (question?.cle) sujets.set(question.cle, question.sujet || question.libelle || question.cle);
  }
  for (const module of corpus) {
    if (module?.produit) sujets.set(module.produit, module.titre || module.produit);
  }
  return sujets;
}
