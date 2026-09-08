/**
 * Les recherches qu'on épingle.
 *
 * ## Pourquoi elles existent
 *
 * On revient toujours aux mêmes questions : « les hypothèses du bâtiment A »,
 * « ce qui reste sans domaine », « les contraintes incendie versées ce mois-ci ».
 * Les retaper à chaque fois use, et l'on finit par ne plus filtrer du tout —
 * c'est-à-dire par lire une liste de trois cents lignes à l'œil.
 *
 * ## Pourquoi elles ne vont pas en base
 *
 * Parce que ce n'est pas une affirmation du projet. Une recherche épinglée est
 * **la façon dont quelqu'un travaille**, pas ce que le projet sait : deux
 * personnes sur le même projet n'épinglent pas les mêmes. La mettre en base la
 * rendrait commune à tous, ce qui est le contraire de ce qu'on veut, et
 * demanderait une table pour un réglage.
 *
 * Elle vit donc dans le navigateur, par projet. Le prix est connu et assumé :
 * on la reperd en changeant de poste. C'est le même prix que la largeur du rail
 * et son repli, rangés au même endroit depuis le début.
 *
 * ## Ce qu'un refus de stockage ne doit pas faire
 *
 * Un navigateur qui refuse le stockage — fenêtre privée, réglage d'entreprise —
 * ne doit pas casser l'écran. On lit une liste vide, on écrit dans le vide, et
 * la recherche du jour fonctionne comme avant.
 */

const CLE = "mdall.memoireRecherches.v1";

const texte = (valeur) => String(valeur ?? "").trim();

/** Tout ce qui est rangé, par projet. */
function lireLeCoffre() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE) ?? "{}");
    return brut && typeof brut === "object" ? brut : {};
  } catch {
    return {};
  }
}

function ecrireLeCoffre(coffre) {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(coffre));
  } catch {
    // Un refus n'est pas une perte : la recherche du jour marche toujours.
  }
}

/**
 * Les recherches épinglées d'un projet, dans l'ordre où on les a posées.
 *
 * @returns {{id: string, titre: string, requete: string}[]}
 */
export function recherchesEpinglees(projet) {
  const cle = texte(projet);
  if (!cle) return [];

  const liste = lireLeCoffre()[cle];
  return (Array.isArray(liste) ? liste : [])
    .map((entree) => ({
      id: texte(entree?.id),
      titre: texte(entree?.titre),
      requete: texte(entree?.requete)
    }))
    .filter((entree) => entree.id && entree.requete);
}

function ranger(projet, liste) {
  const cle = texte(projet);
  if (!cle) return [];

  const coffre = lireLeCoffre();
  coffre[cle] = liste;
  ecrireLeCoffre(coffre);
  return liste;
}

/**
 * Épingler la recherche courante.
 *
 * Une requête déjà épinglée ne s'ajoute pas deux fois : on aurait deux entrées
 * qui font la même chose, et l'on ne saurait plus laquelle effacer. Le titre
 * proposé est la requête elle-même — c'est ce qu'on reconnaît —, et il se
 * renomme ensuite.
 */
export function epingler(projet, requete, titre = "") {
  const dite = texte(requete);
  if (!dite) return recherchesEpinglees(projet);

  const liste = recherchesEpinglees(projet);
  if (liste.some((entree) => entree.requete === dite)) return liste;

  return ranger(projet, [...liste, {
    id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    titre: texte(titre) || dite,
    requete: dite
  }]);
}

/** Renommer. Un titre vide se refuse : une entrée sans nom ne se retrouve pas. */
export function renommerLaRecherche(projet, id, titre) {
  const nom = texte(titre);
  if (!nom) return recherchesEpinglees(projet);

  return ranger(projet, recherchesEpinglees(projet)
    .map((entree) => (entree.id === texte(id) ? { ...entree, titre: nom } : entree)));
}

/** Désépingler. */
export function oublierLaRecherche(projet, id) {
  return ranger(projet, recherchesEpinglees(projet).filter((entree) => entree.id !== texte(id)));
}
