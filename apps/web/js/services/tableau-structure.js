/**
 * Ce qu'un utilitaire déclare de son tableau, et ce que les écrans en tirent.
 *
 * ## La règle, et elle tient en une phrase
 *
 * **Ce qui n'est pas déclaré ne se devine pas.**
 *
 * L'écran d'une variante doit dire si un verdict s'est dégradé, et de combien
 * une marge est dépassée. Il y a deux façons de le lui apprendre. La mauvaise :
 * un dictionnaire de mots — « en défaut », « KO », « non vérifié », « hors
 * domaine » — que quelqu'un enrichirait à chaque utilitaire ajouté, jusqu'à
 * devenir une machine à deviner le sens des mots français, mal, et sans jamais
 * pouvoir dire qu'elle ne sait pas. La bonne : **l'utilitaire le déclare**, une
 * fois, dans sa structure, et l'écran lit la déclaration.
 *
 * Un utilitaire qui ne déclare rien n'est pas un cas particulier à traiter :
 * l'écran reste neutre sur lui, et c'est exact — personne ne lui a dit. Ajouter
 * un utilitaire ne demande donc jamais de toucher à un écran.
 *
 * ## Le vocabulaire est fermé
 *
 * Trois sens possibles pour une valeur énumérée, et pas un de plus. Un
 * vocabulaire ouvert redeviendrait un dictionnaire : chacun écrirait le sien, et
 * les écrans finiraient par les interpréter — c'est-à-dire par deviner.
 *
 * - `tenu` — ce que la valeur affirme est vérifié ;
 * - `rompu` — ce qu'elle affirme ne l'est pas ;
 * - `inconnu` — on n'a pas pu se prononcer.
 *
 * Ces trois mots-là suffisent parce qu'ils ne parlent pas du métier : ils disent
 * seulement ce qu'un lecteur doit ressentir en les voyant. Le métier reste
 * entier dans le libellé que l'utilitaire a choisi — « en défaut », « hors
 * domaine d'emploi » —, et c'est lui qu'on affiche.
 *
 * ## Ce qui se déclare
 *
 * ```js
 * { nom: "vérification", valeurs: [
 *     { nom: "vérifiée", sens: SENS.TENU },
 *     { nom: "en défaut", sens: SENS.ROMPU },
 *     { nom: "non calculée", sens: SENS.INCONNU }
 * ] }
 * { nom: "ratio déterminant", type: "nombre", marge: { limite: 1, comparaison: "au plus" } }
 * { nom: "arase supérieure", type: "nombre, en m" }
 * ```
 *
 * La forme ancienne — `valeurs: ["vérifiée", "en défaut"]` — reste lue : elle
 * déclare les valeurs possibles sans leur sens, et l'écran reste alors neutre.
 * C'est la bonne dégradation : moins d'affichage, jamais d'affichage faux.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'une valeur énumérée fait au lecteur. Fermé, et volontairement.
 *
 * Voir l'en-tête : un quatrième sens serait le début d'un dictionnaire.
 */
export const SENS = { TENU: "tenu", ROMPU: "rompu", INCONNU: "inconnu" };

/** De quel côté d'une limite il faut se tenir. */
export const COMPARAISON = { AU_PLUS: "au plus", AU_MOINS: "au moins" };

const SENS_CONNUS = new Set(Object.values(SENS));

/**
 * Les colonnes d'une structure, groupes dépliés.
 *
 * Une structure se lit à l'écran par groupes — « géométrie », « sol et
 * matériaux » — parce qu'un humain les lit ainsi. Une colonne, elle, se cherche
 * par son nom, et le groupe qui la contient ne doit pas la cacher.
 */
export function colonnesDeclarees(structure = []) {
  const plates = [];

  for (const entree of Array.isArray(structure) ? structure : []) {
    if (!entree || !texte(entree.nom)) continue;
    if (Array.isArray(entree.champs)) {
      for (const champ of colonnesDeclarees(entree.champs)) plates.push({ ...champ, groupe: texte(entree.nom) });
      continue;
    }
    plates.push({ ...entree, groupe: texte(entree.groupe) });
  }

  return plates;
}

/** La colonne qui porte ce nom, ou `null`. */
export function colonneNommee(structure = [], nom = "") {
  const cherche = texte(nom).toLowerCase();
  if (!cherche) return null;
  return colonnesDeclarees(structure).find((colonne) => texte(colonne.nom).toLowerCase() === cherche) ?? null;
}

/**
 * Les valeurs qu'une colonne peut prendre, avec leur sens quand il est déclaré.
 *
 * Les deux écritures sont lues — `["vérifiée"]` et `[{nom: "vérifiée", sens}]` —
 * parce que la seconde est arrivée après la première et qu'une migration se fait
 * par ajout. Sans sens déclaré, `sens` vaut `""` : on ne sait pas, et l'écran le
 * saura.
 */
export function valeursDeclarees(colonne = null) {
  return (Array.isArray(colonne?.valeurs) ? colonne.valeurs : [])
    .map((valeur) => (typeof valeur === "string"
      ? { nom: texte(valeur), sens: "" }
      : { nom: texte(valeur?.nom), sens: SENS_CONNUS.has(texte(valeur?.sens)) ? texte(valeur.sens) : "" }))
    .filter((valeur) => valeur.nom);
}

/**
 * Ce qu'une valeur veut dire pour cette colonne, ou `""`.
 *
 * `""` couvre les trois cas où l'on ne sait pas : colonne non énumérée, valeur
 * hors de l'énumération, sens non déclaré. Les trois se ressemblent à l'usage —
 * l'écran se tait — et les distinguer n'apprendrait rien à personne.
 *
 * **Aucune inférence.** « en défaut » sans déclaration rend `""`, et c'est le
 * cœur du dispositif : un mot n'est pas un sens, et une machine qui lirait les
 * mots pour en tirer des couleurs se tromperait un jour sans le dire.
 */
export function sensDeLaValeur(colonne = null, valeur = "") {
  const cherche = texte(valeur).toLowerCase();
  if (!cherche) return "";
  return valeursDeclarees(colonne).find((declaree) => declaree.nom.toLowerCase() === cherche)?.sens ?? "";
}

/**
 * L'unité d'une colonne, quand elle en a une.
 *
 * Deux écritures, et la seconde n'est pas un pis-aller : `type: "nombre, en m"`
 * est ce que les utilitaires écrivent déjà, à la main, pour les humains. La lire
 * évite de redéclarer partout ce qui est écrit — et `unite: "m"`, explicite,
 * l'emporte quand il est là.
 */
export function uniteDeclaree(colonne = null) {
  const dite = texte(colonne?.unite);
  if (dite) return dite;
  const trouve = texte(colonne?.type).match(/,\s*en\s+(.+)$/i);
  return trouve ? texte(trouve[1]) : "";
}

/**
 * La limite d'une colonne de marge, ou `null`.
 *
 * Sans elle, « 16,050 » est un nombre sans échelle : on ne sait pas si c'est
 * seize fois trop ou seize fois la marge disponible. Avec elle, la phrase
 * s'écrit — et sans elle, elle ne s'écrit pas.
 */
export function margeDeclaree(colonne = null) {
  const limite = Number(colonne?.marge?.limite);
  if (!Number.isFinite(limite) || limite === 0) return null;

  const comparaison = texte(colonne?.marge?.comparaison);
  return {
    limite,
    comparaison: comparaison === COMPARAISON.AU_MOINS ? COMPARAISON.AU_MOINS : COMPARAISON.AU_PLUS
  };
}

/** Un nombre écrit à la française, relu. « 16,050 » vaut 16,05. */
function nombre(valeur) {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : NaN;
  const brut = texte(valeur).replace(/[  \s]/g, "").replace(",", ".");
  const lu = Number.parseFloat(brut);
  return Number.isFinite(lu) ? lu : NaN;
}

/**
 * Où une valeur se situe par rapport à la limite de sa colonne.
 *
 * `null` quand la colonne n'a pas de limite déclarée, ou quand la valeur ne se
 * lit pas comme un nombre. Rendre zéro serait pire : une marge à zéro se lit
 * comme une marge, et se croit.
 *
 * @returns {{fois: number, depasse: boolean, limite: number} | null}
 */
export function ecartALaMarge(colonne = null, valeur = "") {
  const marge = margeDeclaree(colonne);
  const lu = nombre(valeur);
  if (!marge || !Number.isFinite(lu)) return null;

  return {
    fois: lu / marge.limite,
    depasse: marge.comparaison === COMPARAISON.AU_PLUS ? lu > marge.limite : lu < marge.limite,
    limite: marge.limite
  };
}

/**
 * La valeur qui s'éloigne le plus de la limite, parmi celles qu'on lui donne.
 *
 * Douze ratios ne se lisent pas ; celui qui décide, si. C'est lui qui dit s'il
 * s'en est fallu de peu ou si le projet est hors de tout domaine d'emploi, et
 * c'est la seule des douze valeurs qu'une phrase de synthèse peut citer sans
 * choisir arbitrairement.
 *
 * `null` quand la colonne n'a pas de limite déclarée, ou qu'aucune valeur ne se
 * lit comme un nombre.
 *
 * @returns {{valeur: string, fois: number, depasse: boolean, limite: number} | null}
 */
export function pireEcart(colonne = null, valeurs = []) {
  let pire = null;

  for (const valeur of Array.isArray(valeurs) ? valeurs : []) {
    const ecart = ecartALaMarge(colonne, valeur);
    if (!ecart) continue;
    // « Le pire » se mesure du bon côté : sous une limite haute c'est la plus
    // grande valeur, sous une limite basse c'est la plus petite. Prendre le
    // maximum dans les deux cas nommerait la plus confortable.
    const plusLoin = margeDeclaree(colonne)?.comparaison === COMPARAISON.AU_MOINS
      ? ecart.fois < (pire?.fois ?? Number.POSITIVE_INFINITY)
      : ecart.fois > (pire?.fois ?? Number.NEGATIVE_INFINITY);
    if (plusLoin) pire = { valeur: texte(valeur), ...ecart };
  }

  return pire;
}
