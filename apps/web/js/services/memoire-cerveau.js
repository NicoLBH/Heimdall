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
import { VERDICT, auditerLaMemoire } from "./memoire-audit.js";

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

/* ────────────────────────────────────────────────────────────────────────────
 * Ce qu'aucun lien ne touche
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Les nœuds qu'aucun lien ne touche, ni en amont ni en aval.
 *
 * Sur un vrai projet, ils sont la majorité : trois cent onze affirmations pour
 * quatre-vingt-quatorze liens. Les dessiner tous fait un mur dans lequel on ne
 * distingue plus les soixante qui forment le raisonnement.
 *
 * **Ils ne disparaissent pas pour autant.** L'écran les compte et propose de les
 * remettre, parce que leur absence de lien a deux causes qui ne se confondent
 * pas : ou bien rien ne repose sur elles — et c'est une information —, ou bien
 * leurs lectures n'ont pas été enregistrées, et c'est une lacune de l'outil. On
 * ne sait pas laquelle, et on ne le fait pas croire.
 */
export function noeudsIsoles(cerveau = {}) {
  const touches = new Set();
  for (const lien of Array.isArray(cerveau?.liens) ? cerveau.liens : []) {
    touches.add(lien.de);
    touches.add(lien.vers);
  }
  return new Set(
    (Array.isArray(cerveau?.noeuds) ? cerveau.noeuds : [])
      .map((noeud) => texte(noeud.id))
      .filter((id) => id && !touches.has(id))
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Ce que l'audit signale
 * ────────────────────────────────────────────────────────────────────────── */

/** Pourquoi un nœud bat en rouge. Les trois défauts que l'audit sait nommer. */
export const SIGNAL = {
  /** La règle conclut autre chose que ce que le projet affirme. */
  DERIVE: "derive",
  /** La règle ne s'applique plus, et n'a rien à dire à la place. */
  SANS_OBJET: "sans-objet",
  /** Un utilitaire l'a calculée sur une entrée que le projet a changée depuis. */
  PERIMEE: "perimee"
};

const PHRASES_DU_SIGNAL = {
  [SIGNAL.DERIVE]: "sa règle conclut autre chose que ce que le projet affirme",
  [SIGNAL.SANS_OBJET]: "la règle qui la concluait ne s'applique plus",
  [SIGNAL.PERIMEE]: "calculée sur une entrée que le projet a changée depuis"
};

/** Le motif d'un signal, en français. Un point rouge sans motif est une angoisse. */
export function phraseDuSignal(motif) {
  return PHRASES_DU_SIGNAL[texte(motif)] ?? "";
}

/**
 * Ce que l'audit signale, par affirmation.
 *
 * **C'est `auditerLaMemoire`, sans une ligne de plus** — pour la même raison que
 * l'onde est `impactDe` : deux écrans qui jugeraient chacun de leur côté
 * finiraient par ne pas signaler les mêmes choses, et l'on ne saurait plus lequel
 * croire. Ici, le dessin ne juge rien : il colorie ce que l'audit a jugé.
 *
 * @returns {Map<string, string>} affirmation → motif
 */
export function signauxDeLAudit(assertions = []) {
  const audit = auditerLaMemoire(Array.isArray(assertions) ? assertions : []);
  const signales = new Map();

  for (const ligne of audit.verdicts ?? []) {
    const id = texte(ligne?.sortie?.id);
    if (!id) continue;
    if (ligne.verdict === VERDICT.DIFFERENTE) signales.set(id, SIGNAL.DERIVE);
    else if (ligne.verdict === VERDICT.SANS_OBJET && !signales.has(id)) signales.set(id, SIGNAL.SANS_OBJET);
  }

  for (const ligne of audit.perimees ?? []) {
    const id = texte(ligne?.assertion?.id);
    // Une dérive de règle prime : elle dit que la valeur affichée est fausse,
    // là où une entrée périmée dit seulement qu'elle ne vaut plus.
    if (id && !signales.has(id)) signales.set(id, SIGNAL.PERIMEE);
  }

  return signales;
}

/* ────────────────────────────────────────────────────────────────────────────
 * La disposition en volume
 * ────────────────────────────────────────────────────────────────────────── */

/** L'angle d'or : c'est lui qui répartit des points sur une sphère sans les tasser. */
const ANGLE_DOR = Math.PI * (3 - Math.sqrt(5));

/**
 * Le rayon d'une coquille. Le socle au centre, l'aval de plus en plus loin.
 *
 * Non linéaire : les premières strates s'écartent vite, les suivantes se
 * resserrent. C'est là que se trouve la densité — la première strate porte le
 * gros du raisonnement — et lui donner de la place vaut mieux que d'étaler
 * régulièrement une profondeur qui, en pratique, dépasse rarement quatre.
 */
function rayonDeLaCoquille(strate, profondeur) {
  if (strate === 0) return 0.24;
  return 0.42 + 0.58 * Math.sqrt(strate / Math.max(1, profondeur));
}

/**
 * Les nœuds répartis dans un volume : des coquilles concentriques autour du socle.
 *
 * ## Pourquoi le socle est au centre
 *
 * Parce que c'est de lui que tout part. Le projet **pose** des valeurs, et son
 * raisonnement pousse à partir d'elles : les mettre au centre et faire s'éloigner
 * chaque strate donne à voir cette croissance, là où des colonnes donnent à lire
 * un ordre.
 *
 * Le nœud le plus employé du socle est placé exactement au centre. C'est le
 * **centre névralgique** : la valeur dont le plus de choses dépendent, et l'on
 * doit pouvoir la montrer du doigt.
 *
 * ## Pourquoi la spirale d'or
 *
 * Répartir n points sur une sphère « au hasard » les tasse en paquets et laisse
 * des trous ; la spirale d'or les espace régulièrement, sans direction
 * privilégiée. On voit alors la **densité** d'une strate — ce qu'aucune colonne
 * ne montrait : une strate chargée fait une coquille dense, une strate maigre un
 * semis clairsemé.
 *
 * Les coordonnées vont de −1 à 1. L'écran les met à son échelle.
 */
export function dispositionEnVolume(cerveau = {}) {
  const noeuds = Array.isArray(cerveau?.noeuds) ? cerveau.noeuds : [];
  if (!noeuds.length) return [];

  const profondeur = Math.max(1, Number(cerveau?.profondeur) || 1);
  const coquilles = new Map();
  for (const noeud of noeuds) {
    if (!coquilles.has(noeud.strate)) coquilles.set(noeud.strate, []);
    coquilles.get(noeud.strate).push(noeud);
  }

  const places = new Map();

  for (const [strate, coquille] of coquilles) {
    // Le plus employé d'abord : au centre pour le socle, au pôle ailleurs. Un
    // ordre stable, et qui veut dire quelque chose.
    const ordonnee = [...coquille].sort((g, d) => d.lectures - g.lectures || g.id.localeCompare(d.id));
    const rayon = rayonDeLaCoquille(strate, profondeur);
    const centre = strate === 0 && ordonnee.length > 1;
    const surLaCoquille = centre ? ordonnee.slice(1) : ordonnee;

    if (centre) places.set(ordonnee[0].id, { x: 0, y: 0, z: 0 });

    surLaCoquille.forEach((noeud, index) => {
      const total = Math.max(1, surLaCoquille.length);
      // Décalé d'un demi-pas : sans cela, le premier et le dernier nœud tombent
      // **exactement sur les pôles**, où ils s'alignent avec le centre et se
      // superposent dès qu'on regarde par le dessus. Une coquille de deux nœuds
      // devenait alors un seul point.
      const hauteur = 1 - ((index * 2 + 1) / total);
      const anneau = Math.sqrt(Math.max(0, 1 - hauteur * hauteur));
      const angle = ANGLE_DOR * index + graineDe(noeud.id, 3) * 0.4;

      places.set(noeud.id, {
        x: Math.cos(angle) * anneau * rayon,
        y: hauteur * rayon,
        z: Math.sin(angle) * anneau * rayon
      });
    });
  }

  return noeuds.map((noeud) => ({
    ...noeud,
    ...(places.get(noeud.id) ?? { x: 0, y: 0, z: 0 }),
    /** Le déphasage de sa respiration, comme en strates. */
    phase: graineDe(noeud.id, 13) * Math.PI * 2
  }));
}
