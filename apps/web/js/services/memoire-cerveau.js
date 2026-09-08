/**
 * La forme du raisonnement d'un projet : des nœuds, des liens, des strates.
 *
 * ## Ce que cet écran répare
 *
 * On ne voyait pas l'ensemble. On le **lisait** — un tableau, une étude d'impact,
 * un audit — et chacun de ces écrans répond à une question précise, posée une à
 * une. Aucun ne montrait la forme : combien de strates, où est le socle, où sont
 * les nœuds qu'on ne sait pas refaire, et jusqu'où une valeur se propage.
 *
 * Un projet de quatre cents affirmations se lisait par le trou d'une serrure.
 *
 * ## Ce module ne calcule rien de neuf
 *
 * Tout existe déjà : les liens viennent des lectures enregistrées, les natures de
 * `natureDuNoeud`, la propagation de `impactDe` — **la fonction de l'étude
 * d'impact elle-même**, et c'est délibéré. Si l'écran ment, l'étude d'impact ment
 * aussi, et les deux se corrigent ensemble. Un dessin qui aurait sa propre source
 * de vérité finirait par montrer autre chose que ce que l'outil décide.
 *
 * Ce module range ces choses pour qu'elles se dessinent. Il est pur.
 *
 * ## Les strates se déduisent des liens, pas du plan de recalcul
 *
 * `planDeRecalcul` range les **règles d'une zone** dans leur ordre d'exécution :
 * c'est une question de rejeu. Ici, on range **toutes les affirmations** par leur
 * distance au socle, toutes zones confondues : c'est une question de forme. Deux
 * axes différents, tous deux dérivés, aucun stocké — et ils partagent leur source,
 * les liens, si bien qu'ils ne peuvent pas se contredire sur qui dépend de qui.
 *
 * La strate d'un nœud est celle du **plus long chemin** depuis le socle, jamais du
 * plus court : un nœud qui attend deux entrées ne peut pas se calculer avant la
 * dernière, et le placer au plus tôt dessinerait un raisonnement qui ne tient pas.
 *
 * ## Les cycles se montrent
 *
 * Un graphe écrit par des humains en contiendra un. Ce qui ne se stabilise pas
 * n'a pas de strate : on le place au bout, on le **marque**, et on le montre —
 * plutôt que de faire tourner un calcul en rond ou de choisir une strate au
 * hasard, ce qui reviendrait à cacher l'erreur de modèle sous un dessin propre.
 *
 * ## Les positions sont stables d'une ouverture à l'autre
 *
 * Elles se tirent de l'identifiant, pas du hasard. Un projet qui se redessinerait
 * autrement à chaque ouverture ne se raconterait pas : « le gros paquet en haut à
 * droite » doit vouloir dire la même chose demain.
 */

import { NOEUD, natureDuNoeud, sortiesDesRegles } from "./memoire-plan.js";
import { currentAssertions, titreDeLAffirmation } from "./project-memory.js";
import { emploisParAffirmation, impactDe } from "./memoire-applications.js";
import { dependancesDeLaMemoire } from "./memoire-raisonnement.js";
import { utilitaireByReference } from "../utilitaires/catalogue.js";

const texte = (valeur) => String(valeur ?? "").trim();

const estUneRegle = (assertion) => assertion?.payload?.referentiel === true;

/** Combien de tours au plus avant de déclarer qu'une composante se lit en rond. */
const TOURS_MAX = 60;

/**
 * Un nombre stable tiré d'une chaîne, entre 0 et 1.
 *
 * Le hasard visuel doit être **reproductible** : la même mémoire se dessine
 * pareil, ouverture après ouverture. Sans cela, on ne peut ni se souvenir d'une
 * forme, ni la montrer à quelqu'un d'autre.
 */
export function graineDe(valeur, sel = 0) {
  let h = 2166136261 ^ Number(sel);
  const chaine = texte(valeur);
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Les liens du raisonnement, avec le poids de chacun.
 *
 * Les **lectures enregistrées** quand on les a, lues telles quelles — une ligne
 * par lecture. C'est ce que fait `impactDe`, et c'est voulu : l'arête dessinée et
 * l'arête parcourue par l'onde viennent des mêmes lignes, si bien qu'on ne peut
 * pas dessiner un chemin que l'onde n'emprunterait pas.
 *
 * On ne passe pas par `dependancesDesApplications`, qui **dédoublonne** : elle dit
 * « repose sur », pas « combien de fois ». Ici le combien compte — c'est
 * l'épaisseur du trait, et une règle qui lit trois fois la même donnée en dépend
 * plus lourdement qu'une qui la lit une fois.
 *
 * À défaut de lectures, on déduit les liens des conditions écrites dans les
 * règles — ce qu'on faisait avant l'étape 1, et qui reste vrai en moins sûr.
 * L'écran doit le dire : une forme dessinée sur des ressemblances de noms n'est
 * pas la même chose qu'une forme dessinée sur ce que les règles ont lu.
 */
export function liensDuRaisonnement(assertions = [], applications = null) {
  const enregistrees = Array.isArray(applications) && applications.length;
  const poids = new Map();

  const compter = (de, vers) => {
    if (!de || !vers || de === vers) return;
    const cle = `${de}>${vers}`;
    poids.set(cle, (poids.get(cle) ?? 0) + 1);
  };

  if (enregistrees) {
    for (const ligne of applications) {
      compter(texte(ligne?.input_assertion_id), texte(ligne?.output_assertion_id));
    }
  } else {
    for (const lien of dependancesDeLaMemoire(assertions)) {
      compter(texte(lien?.depends_on_assertion_id), texte(lien?.assertion_id));
    }
  }

  return {
    enregistres: Boolean(enregistrees),
    liens: [...poids.entries()].map(([cle, poidsDuLien]) => {
      const [de, vers] = cle.split(">");
      return { de, vers, poids: poidsDuLien };
    })
  };
}

/**
 * La strate de chaque nœud : sa distance au socle, par le plus long chemin.
 *
 * @returns {{strates: Map<string, number>, enRond: Set<string>, profondeur: number}}
 */
export function stratesDuGraphe(ids = [], liens = []) {
  const connus = new Set(ids.map(texte).filter(Boolean));
  const amont = new Map([...connus].map((id) => [id, []]));

  for (const lien of liens) {
    if (!connus.has(lien.de) || !connus.has(lien.vers)) continue;
    amont.get(lien.vers).push(lien.de);
  }

  const strates = new Map([...connus].map((id) => [id, 0]));
  let bouge = true;
  let tours = 0;

  // On monte les nœuds tant qu'un amont les pousse. Ce qui pousse encore après
  // `TOURS_MAX` se lit en rond : on le nomme au lieu de tourner.
  while (bouge && tours < TOURS_MAX) {
    bouge = false;
    tours += 1;
    for (const [id, entrees] of amont) {
      if (!entrees.length) continue;
      const rang = Math.max(...entrees.map((entree) => strates.get(entree) ?? 0)) + 1;
      if (rang > (strates.get(id) ?? 0)) { strates.set(id, rang); bouge = true; }
    }
  }

  const enRond = new Set();
  if (bouge) {
    // La composante qui n'a pas fini de monter est celle qui se lit elle-même.
    // On la reconnaît à ce qu'elle a dépassé la profondeur possible d'un graphe
    // sans cycle : au plus un nœud par strate.
    for (const [id, rang] of strates) if (rang >= connus.size) enRond.add(id);
  }

  const profondeur = [...strates.entries()]
    .filter(([id]) => !enRond.has(id))
    .reduce((max, [, rang]) => Math.max(max, rang), 0);

  for (const id of enRond) strates.set(id, profondeur + 1);

  return { strates, enRond, profondeur };
}

/**
 * Le cerveau du projet, prêt à dessiner.
 *
 * @param {object[]} assertions la mémoire du projet
 * @param {object[]|null} applications les lectures enregistrées, si on les a
 * @returns {{noeuds: object[], liens: object[], profondeur: number,
 *   compte: object, enregistres: boolean, cycles: string[]}}
 */
export function cerveauDuProjet(assertions = [], applications = null) {
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : []);

  // Une règle est le **texte** qui produit une valeur, pas une valeur : la
  // dessiner ferait un nœud de plus par sujet, sans rien apprendre.
  const valeurs = enVigueur.filter((assertion) => !estUneRegle(assertion)).filter((a) => texte(a?.id));

  const produites = sortiesDesRegles(enVigueur);
  const { liens, enregistres } = liensDuRaisonnement(enVigueur, applications);
  const ids = valeurs.map((assertion) => texte(assertion.id));
  const { strates, enRond, profondeur } = stratesDuGraphe(ids, liens);

  const emplois = emploisParAffirmation(Array.isArray(applications) ? applications : []);
  const dedans = new Set(ids);

  const noeuds = valeurs.map((assertion) => {
    const id = texte(assertion.id);
    const nature = natureDuNoeud(assertion, { produites });
    const utilitaire = texte(assertion?.payload?.utilitaire);

    return {
      id,
      assertion,
      titre: titreDeLAffirmation(assertion),
      sujet: texte(assertion?.payload?.subject) || titreDeLAffirmation(assertion),
      valeur: texte(assertion?.payload?.value),
      nature,
      strate: strates.get(id) ?? 0,
      enRond: enRond.has(id),
      // Combien de fois ce que le projet affirme s'appuie sur ce nœud. C'est ce
      // qui décide de sa taille : une donnée lue quarante fois n'est pas un point
      // comme les autres.
      lectures: emplois.get(id)?.lectures ?? 0,
      utilitaire,
      /**
       * Un nœud opaque qui **sait se rejouer** au serveur.
       *
       * C'est ce que la dernière livraison a changé, et l'écran doit le montrer :
       * « on sait qu'il dépend » et « on sait le refaire » ne sont plus la même
       * chose pour tout le monde.
       */
      rejouable: nature === NOEUD.OPAQUE && Boolean(utilitaireByReference(utilitaire)?.rejeu?.outil)
    };
  });

  const compte = {
    socle: noeuds.filter((n) => n.nature === NOEUD.SOCLE).length,
    rejouables: noeuds.filter((n) => n.nature === NOEUD.REJOUABLE).length,
    opaques: noeuds.filter((n) => n.nature === NOEUD.OPAQUE).length,
    // Ceux des opaques que le serveur sait refaire : le compte honnête de ce
    // qu'une variante rendra vraiment.
    auServeur: noeuds.filter((n) => n.rejouable).length,
    liens: liens.length
  };

  return {
    noeuds,
    liens: liens.filter((lien) => dedans.has(lien.de) && dedans.has(lien.vers)),
    profondeur,
    compte,
    /** Les liens viennent-ils de lectures enregistrées, ou d'un rapprochement de noms ? */
    enregistres,
    cycles: [...enRond]
  };
}

/**
 * L'onde : ce qui s'allume, strate par strate, quand cette valeur bouge.
 *
 * **C'est la fonction de l'étude d'impact**, sans une ligne de plus. Le dessin ne
 * doit pas avoir sa propre idée de ce qui dépend de quoi : si l'un des deux ment,
 * les deux mentent, et on les corrige ensemble.
 *
 * Le rejeu, lui, ne s'arrête pas devant un nœud opaque — il en dépend, et le
 * dire s'arrête là serait faux depuis que les utilitaires se rejouent au serveur.
 * Ce que l'écran distingue, c'est la **nature** de ce qui s'allume.
 */
export function ondeDepuis(depart, applications = []) {
  return impactDe(depart, applications);
}

/**
 * Où poser chaque nœud : les strates en colonnes, l'intérieur organique.
 *
 * Pas une grille. Une grille se lit comme un tableau, et l'on a déjà un tableau ;
 * ce qu'on vient chercher ici est la **forme**. Les nœuds d'une même strate sont
 * donc répartis en hauteur avec un décalage tiré de leur identifiant — stable, et
 * assez irrégulier pour qu'on distingue les paquets.
 *
 * Les coordonnées sont **relatives** (0 à 1) : l'écran les met à son échelle, et
 * un redimensionnement ne recalcule pas la disposition.
 */
export function dispositionDuCerveau(cerveau = {}) {
  const noeuds = Array.isArray(cerveau?.noeuds) ? cerveau.noeuds : [];
  if (!noeuds.length) return [];

  const colonnes = new Map();
  for (const noeud of noeuds) {
    if (!colonnes.has(noeud.strate)) colonnes.set(noeud.strate, []);
    colonnes.get(noeud.strate).push(noeud);
  }

  const rangs = [...colonnes.keys()].sort((a, b) => a - b);
  const dernier = Math.max(1, rangs.length - 1);

  return noeuds.map((noeud) => {
    const colonne = colonnes.get(noeud.strate);
    // Dans une strate, on range les plus employés au centre : c'est là que l'œil
    // va, et c'est là que se trouve ce dont tout dépend.
    const ordonnee = [...colonne]
      .sort((g, d) => d.lectures - g.lectures || g.id.localeCompare(d.id))
      .findIndex((autre) => autre.id === noeud.id);

    // Replié depuis le centre : 0, 1, 2, 3 → milieu, un cran au-dessus, un cran
    // au-dessous, deux crans au-dessus. Le nœud le plus employé reste au milieu,
    // et la colonne s'ouvre autour de lui plutôt que de tomber d'un côté.
    const cran = Math.ceil(ordonnee / 2) / Math.max(1, Math.floor(colonne.length / 2));
    const ecart = (ordonnee % 2 === 1 ? -1 : 1) * cran * 0.42;

    return {
      ...noeud,
      x: rangs.indexOf(noeud.strate) / dernier,
      y: Math.min(0.96, Math.max(0.04, 0.5 + ecart + (graineDe(noeud.id, 7) - 0.5) * 0.08)),
      // Le déphasage de sa respiration : sans lui, tout le cerveau battrait
      // d'un seul bloc, ce qui ressemble à un défaut d'affichage.
      phase: graineDe(noeud.id, 13) * Math.PI * 2
    };
  });
}
