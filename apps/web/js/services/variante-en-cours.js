/**
 * La variante qu'on est en train d'essayer, et rien d'autre.
 *
 * ## Pourquoi elle ne se range nulle part
 *
 * Une variante n'est pas une donnée du projet : c'est une **lecture en cours**.
 * L'écrire en base en ferait une seconde vérité durable, ce qu'on a précisément
 * refusé en abandonnant l'idée des branches. La mettre dans le stockage du
 * navigateur serait pire : on rouvrirait l'application trois jours plus tard en
 * mode variante sans s'en souvenir, et on lirait une mémoire fausse en croyant
 * lire la mémoire.
 *
 * Elle vit donc en portée de module, et **elle meurt au rechargement**. C'est le
 * bon sens de l'oubli : sortir du mode par accident est sans conséquence, y
 * rester par accident ne l'est pas.
 *
 * ## Une seule à la fois
 *
 * Deux variantes superposées ne se lisent pas : « et si l'altitude était de
 * 890 m, sur la mémoire où elle vaut déjà 1 200 m » n'est une phrase pour
 * personne. Poser une variante remplace celle qui était là.
 */

const abonnes = new Set();

let enCours = null;

/** La variante essayée, ou `null` quand on lit la mémoire du projet. */
export function varianteEnCours() {
  return enCours;
}

/** Vrai quand ce qui est à l'écran n'est pas la mémoire du projet. */
export function onLitUneVariante() {
  return enCours !== null;
}

function prevenir() {
  for (const abonne of [...abonnes]) {
    try {
      abonne(enCours);
    } catch {
      // Un écran qui se redessine mal ne doit pas empêcher les autres de savoir
      // qu'on vient d'entrer — ou de sortir — du mode variante.
    }
  }
}

/** Entrer dans une variante. Celle qui était là, s'il y en avait une, sort. */
export function essayerLaVariante(variante) {
  enCours = variante ?? null;
  prevenir();
  return enCours;
}

/** Sortir, et revenir à ce que le projet dit. */
export function abandonnerLaVariante() {
  if (enCours === null) return;
  enCours = null;
  prevenir();
}

/**
 * Être prévenu quand on entre dans une variante ou qu'on en sort.
 *
 * Les écrans s'y abonnent pour se redessiner : le bandeau doit apparaître
 * partout au même instant, sinon on peut se retrouver devant une page qui n'a
 * pas l'air d'être en variante alors qu'elle l'est.
 *
 * @returns {() => void} de quoi se désabonner
 */
export function quandLaVarianteChange(ecouteur) {
  if (typeof ecouteur !== "function") return () => {};
  abonnes.add(ecouteur);
  return () => abonnes.delete(ecouteur);
}
