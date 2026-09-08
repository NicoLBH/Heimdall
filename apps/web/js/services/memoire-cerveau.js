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
import { DOMAINS, domainLabel } from "./assertion-taxonomy.js";
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

  // Le degré de chaque nœud : combien de liens le touchent, et dans quel sens.
  const degres = new Map(ids.map((id) => [id, { entrant: 0, sortant: 0 }]));
  for (const lien of liens) {
    if (degres.has(lien.de)) degres.get(lien.de).sortant += lien.poids;
    if (degres.has(lien.vers)) degres.get(lien.vers).entrant += lien.poids;
  }

  const noeuds = valeurs.map((assertion) => {
    const id = texte(assertion.id);
    const nature = natureDuNoeud(assertion, { produites });
    const utilitaire = texte(assertion?.payload?.utilitaire);
    const degre = degres.get(id) ?? { entrant: 0, sortant: 0 };

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
      /**
       * Ce qui touche ce nœud, et dans quel sens.
       *
       * `sortant` est sa **dispersion** : combien de choses partent de lui. C'est
       * ce qui fait qu'une valeur est chaude — pas le fait d'exister, mais le
       * nombre de raisonnements qui la traversent.
       */
      entrant: degre.entrant,
      sortant: degre.sortant,
      /**
       * Le poids : ce que ce nœud pèse dans le raisonnement.
       *
       * Deux termes qui ne disent pas la même chose, et il faut les deux. Les
       * **emplois** disent combien de fois une valeur est lue ; le **degré** dit
       * à combien de choses différentes elle touche. Une donnée lue dix fois par
       * une seule règle et une donnée lue une fois par dix règles ne pèsent pas
       * pareil, et ne compter que l'un des deux les confondrait.
       */
      poids: (emplois.get(id)?.lectures ?? 0) + degre.entrant + degre.sortant,
      domaine: texte(assertion?.domain) || texte(assertion?.payload?.domain),
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
    liens: liens.length,
    /** Le poids le plus lourd : c'est l'échelle à laquelle les autres se lisent. */
    poidsMax: noeuds.reduce((max, noeud) => Math.max(max, noeud.poids), 0)
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

/* ────────────────────────────────────────────────────────────────────────────
 * Le regroupement par domaine
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Les domaines présents, dans l'ordre du vocabulaire, plus « sans domaine ».
 *
 * L'ordre vient de `DOMAINS` et non de ce que le projet contient : deux projets
 * doivent placer l'incendie au même endroit, sans quoi on ne peut pas dire « la
 * zone dense, en haut à droite, c'est l'incendie » d'un projet à l'autre.
 */
export function domainesDuCerveau(cerveau = {}) {
  const noeuds = Array.isArray(cerveau?.noeuds) ? cerveau.noeuds : [];
  const presents = new Set(noeuds.map((noeud) => texte(noeud.domaine)));

  const ordonnes = DOMAINS.filter((domaine) => presents.has(domaine));
  if (presents.has("")) ordonnes.push("");

  return ordonnes.map((domaine, index) => ({
    domaine,
    libelle: domaine ? domainLabel(domaine) : "Sans domaine",
    /** Sa direction, en radians. Fixe pour un domaine donné, quel que soit le projet. */
    cap: (DOMAINS.indexOf(domaine) >= 0 ? DOMAINS.indexOf(domaine) : DOMAINS.length)
      / (DOMAINS.length + 1) * Math.PI * 2,
    rang: index,
    combien: noeuds.filter((noeud) => texte(noeud.domaine) === domaine).length
  }));
}

/**
 * Combien la disposition penche vers les domaines. Zéro : pas du tout.
 *
 * **Un penchant, pas une partition.** Regrouper franchement donnerait huit
 * paquets séparés — et l'on perdrait ce qu'on est venu voir : les chaînes qui
 * traversent les domaines, une altitude du site qui nourrit une cote de fondation
 * qui commande un ferraillage. Le raisonnement d'un projet ne respecte pas les
 * disciplines, et un dessin qui le rangerait par discipline le ferait mentir.
 */
export const PENCHANT = 0.7;

/**
 * De combien les secteurs voisins se chevauchent.
 *
 * C'est ce qui empêche le dessin de devenir un camembert. Un tiers de
 * chevauchement suffit à ce que les bords se mêlent : on reconnaît une zone sans
 * pouvoir tracer la frontière, ce qui est exactement l'état de la réalité — une
 * hauteur de plancher sert l'incendie **et** l'accessibilité.
 */
const CHEVAUCHEMENT = 0.35;

/** L'écart le plus court entre deux angles, en tenant compte du tour complet. */
const ecartAngulaire = (de, vers) => Math.atan2(Math.sin(vers - de), Math.cos(vers - de));

/**
 * La même disposition, penchée vers les domaines.
 *
 * Elle s'applique **après** la disposition, pas à sa place : les strates et les
 * coquilles restent ce qu'elles sont — ce sont elles qui portent le raisonnement
 * —, et le domaine ne fait que décider où l'on se pose **dans** sa strate.
 * L'inverse — grouper d'abord, stratifier ensuite — casserait la lecture des
 * chaînes, qui est la raison d'être de l'écran.
 *
 * Chaque domaine reçoit un secteur ; à l'intérieur, chaque nœud garde son écart
 * propre, si bien qu'une zone est dense sans être un bloc. Puis on **mélange**
 * avec la position d'origine : à `PENCHANT`, la zone se reconnaît et les liens
 * qui la traversent restent lisibles.
 */
export function pencherVersLesDomaines(places = [], cerveau = {}, force = PENCHANT) {
  if (!force || !Array.isArray(places) || !places.length) return places;

  const domaines = domainesDuCerveau(cerveau);
  if (domaines.length < 2) return places;

  const rangs = new Map(domaines.map((entree, index) => [entree.domaine, index]));
  const secteur = (Math.PI * 2 / domaines.length) * (1 + CHEVAUCHEMENT);
  const enVolume = places.some((place) => typeof place.z === "number");

  return places.map((place) => {
    const rang = rangs.get(texte(place.domaine));
    if (rang === undefined) return place;

    // Sa place **à lui** dans son secteur, tirée de son identifiant : stable, et
    // assez dispersée pour que le secteur ne devienne pas un trait.
    const dedans = graineDe(place.id, 23) - 0.5;

    if (!enVolume) {
      // En strates, seule la hauteur est libre : la colonne dit la strate et ne
      // se négocie pas. Chaque domaine reçoit donc une bande horizontale.
      const bande = (rang + 0.5) / domaines.length + dedans * (1 / domaines.length) * (1 + CHEVAUCHEMENT);
      return { ...place, y: Math.min(0.96, Math.max(0.04, place.y * (1 - force) + bande * force)) };
    }

    // En volume, on tourne vers le cap du domaine sans toucher à la hauteur : une
    // coquille reste une coquille, et donc une strate reste une strate.
    const rayon = Math.hypot(place.x, place.z);
    if (rayon < 1e-6) return place;

    const angle = Math.atan2(place.z, place.x);
    const vise = (rang / domaines.length) * Math.PI * 2 + dedans * secteur;
    const tourne = angle + ecartAngulaire(angle, vise) * force;

    return { ...place, x: Math.cos(tourne) * rayon, z: Math.sin(tourne) * rayon };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * La chaleur
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * La chaleur d'un nœud : 0 pour ce qui ne sert à rien, 1 pour le plus chargé.
 *
 * ## Pourquoi une racine, et pas une règle de trois
 *
 * Les poids d'un projet ne se répartissent pas également : trois nœuds pèsent
 * quarante, deux cents en pèsent un ou deux. Une échelle linéaire écraserait donc
 * tout le milieu contre le froid, et l'on ne verrait que les trois extrêmes — ce
 * qu'on savait déjà. La racine étale le bas de l'échelle, là où se trouve la
 * matière qu'on cherche à distinguer.
 *
 * ## Ce que la chaleur n'est pas
 *
 * Ce n'est **pas** un jugement. Un nœud froid n'est pas suspect, un nœud chaud
 * n'est pas juste : la chaleur dit seulement combien de raisonnement passe par
 * là. Ce qui va mal est dit ailleurs — par l'audit —, et c'est pour cela que le
 * rouge lui est réservé et n'apparaît jamais au bout d'un dégradé d'orange.
 */
export function chaleurDuNoeud(noeud = {}, poidsMax = 0) {
  const max = Math.max(1, Number(poidsMax) || 0);
  return Math.min(1, Math.sqrt(Math.max(0, Number(noeud?.poids) || 0) / max));
}

/**
 * La chaleur d'un lien : celle de la plus chaude de ses deux extrémités.
 *
 * Pas la moyenne. Un lien qui part d'une donnée employée quarante fois **est** un
 * lien important, même s'il aboutit à une conclusion terminale dont rien ne
 * dépend ; en faire la moyenne le refroidirait de moitié et effacerait du dessin
 * les branches maîtresses.
 */
export function chaleurDuLien(lien = {}, parId = new Map(), poidsMax = 0) {
  return Math.max(
    chaleurDuNoeud(parId.get(lien?.de), poidsMax),
    chaleurDuNoeud(parId.get(lien?.vers), poidsMax)
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le contour d'un domaine
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * L'enveloppe convexe d'un nuage de points, par la chaîne monotone d'Andrew.
 *
 * C'est la façon la plus honnête de dessiner « le territoire » d'un domaine : elle
 * n'invente aucun point, elle entoure ceux qui existent. Une forme lissée à la
 * main — un cercle posé sur le barycentre, par exemple — envelopperait du vide et
 * ferait croire à une zone là où il n'y a personne.
 *
 * @param {{x: number, y: number}[]} points
 * @returns {{x: number, y: number}[]} le contour, dans le sens trigonométrique
 */
export function enveloppeConvexe(points = []) {
  const tries = [...points]
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .sort((g, d) => g.x - d.x || g.y - d.y);
  if (tries.length < 3) return tries;

  const croix = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const moitie = (liste) => {
    const pile = [];
    for (const point of liste) {
      while (pile.length >= 2 && croix(pile[pile.length - 2], pile[pile.length - 1], point) <= 0) pile.pop();
      pile.push(point);
    }
    pile.pop();
    return pile;
  };

  return [...moitie(tries), ...moitie([...tries].reverse())];
}

/**
 * Le même contour, écarté de ses points.
 *
 * Sans marge, le voile passerait **par** les nœuds du bord et les couperait en
 * deux. On l'écarte donc depuis le barycentre — assez pour que les nœuds soient
 * dedans, pas assez pour que deux domaines voisins se recouvrent.
 */
export function dilaterLEnveloppe(contour = [], marge = 0) {
  if (!Array.isArray(contour) || contour.length < 3) return contour;

  const centre = contour.reduce(
    (acc, point) => ({ x: acc.x + point.x / contour.length, y: acc.y + point.y / contour.length }),
    { x: 0, y: 0 }
  );

  return contour.map((point) => {
    const dx = point.x - centre.x;
    const dy = point.y - centre.y;
    const distance = Math.hypot(dx, dy) || 1;
    return { x: point.x + (dx / distance) * marge, y: point.y + (dy / distance) * marge };
  });
}

/**
 * Ce point est-il dans ce contour ? Par le lancer de rayon.
 *
 * C'est ce qui permet de survoler **une zone** et non un nœud : on désigne un
 * domaine en pointant le vide entre ses valeurs, ce qui est exactement le geste
 * qu'on fait quand on dit « ce paquet, là ».
 */
export function dansLEnveloppe(point = {}, contour = []) {
  if (!Array.isArray(contour) || contour.length < 3) return false;

  let dedans = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
    const a = contour[i];
    const b = contour[j];
    const traverse = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x;
    if (traverse) dedans = !dedans;
  }
  return dedans;
}
