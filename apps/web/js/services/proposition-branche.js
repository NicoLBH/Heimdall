/**
 * Une branche : une proposition ouverte à laquelle on attache des modifications.
 *
 * ## Ce qu'une branche est ici, et ce qu'elle n'est pas
 *
 * Ce n'est **pas** la branche de git, et la table le dit depuis le premier jour :
 * « l'autre moitié de la métaphore — la branche — est abandonnée ». Une copie de
 * travail isolée supposerait de dupliquer quinze tables et leurs cascades, pour
 * versionner ce qui est déjà dérivé. Une seule mémoire, une seule vérité.
 *
 * Ce dont on avait besoin est plus simple, et plus utile : **une proposition qui
 * ne soit pas mono-action**. On l'ouvre, on l'enrichit d'une modification, puis
 * d'une autre, et quand elle est complète on la fusionne. Plusieurs peuvent
 * vivre en même temps.
 *
 * La base l'accueillait déjà sans le savoir : `proposition_items` est unique sur
 * `(proposition_id, item_type, item_key)` et le versement se fait en
 * `merge-duplicates`. Y porter un deuxième lot ajoute ce qui est nouveau et
 * remplace ce qui porte la même clé. Rien à migrer — il manquait le geste, et
 * les trois choses qu'une branche doit **dire**.
 *
 * ## Les trois choses qu'une branche doit dire
 *
 * **Ce qu'on écraserait.** Repousser une clé déjà tranchée dans la branche
 * remettrait l'item à « proposé » et effacerait qui avait décidé, et quand — une
 * décision humaine, effacée par un lot automatique. On les retient, et on les
 * nomme.
 *
 * **Ce que deux branches se disputent.** Deux propositions ouvertes sur le même
 * sujet affichent chacune le même « avant », et rien ne dit qu'elles se
 * contredisent. Le conflit se **dit** avant la fusion, jamais résolu en silence.
 *
 * **Ce que la mémoire a changé dessous.** Une proposition ouverte depuis trois
 * semaines sur une mémoire qui a bougé a exactement le même air qu'une
 * proposition fraîche. C'est la même question que pour une variante, et la même
 * réponse : elle se **calcule**, elle ne se stocke pas.
 *
 * ## Rien n'est stocké, tout se calcule à la lecture
 *
 * Aucune de ces trois réponses n'entre en base. Une valeur écrite à deux
 * endroits finit par diverger (règle 4), et un registre des collisions serait
 * faux dès la proposition suivante. C'est la discipline de
 * `memoire-domiciles.js`, dont ce fichier reprend aussi la forme : **une ligne
 * par nom**, jamais une par versement — répéter le même conflit pour chaque
 * valeur ferait lire trente désaccords là où il y en a un.
 */

import { PROPOSITION } from "./proposition-state.js";
import { affirmationsDUneProposition } from "./proposition-avant-apres.js";
import { currentAssertions } from "./project-memory.js";

const texte = (valeur) => String(valeur ?? "").trim();

const cleDe = (item) => texte(item?.itemKey ?? item?.item_key);
const typeDe = (item) => texte(item?.itemType ?? item?.item_type);

/** Le sujet en clair. La clé est un identifiant : elle ne se lit pas. */
const nomDe = (item, cle) => texte(item?.payload?.subject) || texte(item?.statement) || cle;

/**
 * Les propositions qui accueillent encore, la plus récente d'abord.
 *
 * `null` en entrée se propage en `null` : la base n'a pas répondu, et un menu
 * qui afficherait alors « aucune proposition ouverte » ferait ouvrir une
 * deuxième branche à côté de celle qu'on ne voyait pas (règle 5). Une liste
 * vide, elle, est une réponse : il n'y en a aucune.
 *
 * @param {object[]|null} propositions ce que la base a rendu, ou `null`
 * @returns {object[]|null}
 */
export function branchesQuiAccueillent(propositions = null) {
  if (!Array.isArray(propositions)) return null;
  return propositions.filter((proposition) => proposition?.status === PROPOSITION.OPEN);
}

/**
 * Comment une branche s'annonce dans un menu.
 *
 * Le numéro **et** le titre : le numéro seul ne dit pas de quoi il s'agit, le
 * titre seul ne se retrouve pas dans l'écran des propositions.
 */
export function libelleDeLaBranche(proposition = null) {
  const titre = texte(proposition?.title) || "Sans titre";
  const numero = Number(proposition?.number);
  return Number.isFinite(numero) && numero > 0 ? `#${numero} ${titre}` : titre;
}

/**
 * Ce qu'on peut porter dans une branche, et ce qui y heurterait une décision.
 *
 * Le versement remet chaque item à « proposé » et efface `decided_by` et
 * `decided_at`. Sur une clé encore proposée, c'est exactement ce qu'on veut :
 * la branche porte la dernière version, comme on pousse un commit. Sur une clé
 * **tranchée**, ce serait effacer sans le dire ce que quelqu'un a accepté ou
 * refusé — et un refus effacé est un refus qu'on ne pourra pas contester.
 *
 * On les retient donc, et on les rend. À l'appelant de le dire : les taire
 * laisserait croire que le lot est entré en entier.
 *
 * @param {object[]} items ce qu'on veut porter
 * @param {object[]} dejaLa les items de la branche visée
 * @returns {{portables: object[], tranches: {cle: string, nom: string, statut: string}[]}}
 */
export function itemsPortablesDansLaBranche(items = [], dejaLa = []) {
  const decidees = new Map();
  for (const item of Array.isArray(dejaLa) ? dejaLa : []) {
    const statut = texte(item?.status);
    if (statut && statut !== "proposed") decidees.set(`${typeDe(item)}|${cleDe(item)}`, item);
  }

  const portables = [];
  const tranches = [];

  for (const item of Array.isArray(items) ? items : []) {
    const cle = cleDe(item);
    const tranche = decidees.get(`${typeDe(item)}|${cle}`);
    if (!tranche) {
      portables.push(item);
      continue;
    }
    tranches.push({ cle, nom: nomDe(tranche, cle), statut: texte(tranche?.status) });
  }

  return { portables, tranches };
}

/**
 * Ce que deux branches ouvertes se disputent.
 *
 * Une ligne par sujet, jamais une par item : c'est le sujet qui se règle, et le
 * répéter pour chaque valeur portée ferait lire trente conflits là où il y en a
 * un — la leçon de `versementsHorsDomicile`.
 *
 * L'intendance ne compte pas : un document qui entre au corpus n'est pas une
 * affirmation sur le projet, et deux branches qui déposent le même fichier ne se
 * contredisent pas.
 *
 * @param {object[]} items les items de la branche qu'on regarde
 * @param {{proposition: object, items: object[]}[]} ailleurs les autres branches ouvertes
 * @returns {{cle: string, nom: string, propositionId: string, numero: number|null, titre: string}[]}
 */
export function collisionsEntreBranches({ items = [], ailleurs = [] } = {}) {
  const miens = new Map();
  for (const item of affirmationsDUneProposition(items)) {
    const cle = cleDe(item);
    if (cle && !miens.has(cle)) miens.set(cle, nomDe(item, cle));
  }
  if (!miens.size) return [];

  const dits = new Set();
  const collisions = [];

  for (const autre of Array.isArray(ailleurs) ? ailleurs : []) {
    const proposition = autre?.proposition;
    if (proposition?.status !== PROPOSITION.OPEN) continue;

    for (const item of affirmationsDUneProposition(autre?.items ?? [])) {
      const cle = cleDe(item);
      if (!cle || !miens.has(cle) || dits.has(cle)) continue;
      dits.add(cle);

      const numero = Number(proposition?.number);
      collisions.push({
        cle,
        nom: miens.get(cle),
        propositionId: texte(proposition?.id),
        numero: Number.isFinite(numero) && numero > 0 ? numero : null,
        titre: texte(proposition?.title)
      });
    }
  }

  return collisions;
}

/**
 * Ce que la mémoire a décidé sous une branche depuis qu'elle est ouverte.
 *
 * Une branche vieillit. Une proposition ouverte il y a trois semaines sur une
 * mémoire qui a bougé a exactement le même air qu'une proposition d'hier, et
 * c'est ainsi qu'on fusionne par-dessus une décision qu'on n'a pas vue.
 *
 * **Calculé, jamais estampillé.** On aurait pu figer un compte et une date à
 * l'ouverture, comme une variante le fait ; mais une proposition vit des jours,
 * et un compte figé aurait vieilli lui aussi. On compare donc, à la lecture, la
 * date d'ouverture à ce que la mémoire dit **des sujets que la branche touche**
 * — ce qui répond en plus à « lesquels », là où un compte n'aurait dit que
 * « quelque chose ».
 *
 * `assertions` à `null` veut dire « la mémoire n'a pas pu être lue ». On rend
 * alors `lue: false` et aucun sujet : répondre « rien n'a bougé » ferait signer
 * en croyant avoir vérifié (règle 5).
 *
 * @param {object} proposition la branche, pour sa date d'ouverture
 * @param {object[]} items ses items
 * @param {object[]|null} assertions la mémoire, ou `null` si illisible
 * @returns {{lue: boolean, sujets: {cle: string, nom: string, depuis: string}[]}}
 */
export function laMemoireABougeSousLaBranche({
  proposition = null, items = [], assertions = null
} = {}) {
  if (!Array.isArray(assertions)) return { lue: false, sujets: [] };

  const ouverte = texte(proposition?.created_at);
  if (!ouverte) return { lue: true, sujets: [] };

  const miens = new Map();
  for (const item of affirmationsDUneProposition(items)) {
    const cle = cleDe(item);
    if (cle && !miens.has(cle)) miens.set(cle, nomDe(item, cle));
  }
  if (!miens.size) return { lue: true, sujets: [] };

  const sujets = [];
  const dits = new Set();

  for (const assertion of currentAssertions(assertions)) {
    // Ce que la branche a elle-même écrit ne lui a pas bougé sous les pieds.
    if (texte(assertion?.proposition_id) === texte(proposition?.id)) continue;

    const cle = texte(assertion?.subject_key);
    if (!cle || !miens.has(cle) || dits.has(cle)) continue;

    // Les dates sont ISO 8601 en UTC : la comparaison de chaînes les ordonne.
    const quand = texte(assertion?.decided_at);
    if (!quand || quand <= ouverte) continue;

    dits.add(cle);
    sujets.push({ cle, nom: miens.get(cle), depuis: quand });
  }

  return { lue: true, sujets };
}
