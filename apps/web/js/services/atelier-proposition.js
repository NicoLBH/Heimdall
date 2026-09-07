/**
 * De la matière d'Atelier à une proposition.
 *
 * ## Ce que ce fichier est, et ce qu'il n'est pas
 *
 * Il **prépare**. Il n'écrit rien dans la mémoire du projet, et aucun chemin
 * d'ici n'y mène — voir `docs/fondamentaux.md`, règle 1. Il assemble ce qu'un
 * utilitaire a produit en une proposition **ouverte**, que quelqu'un relira,
 * confrontera à ce que le projet a déjà décidé, et signera. Ou pas.
 *
 * C'est cette étape qui donne à la mémoire ce qu'une écriture directe lui
 * enlèverait : une histoire, un signataire, des conflits arbitrés avant l'entrée
 * plutôt que découverts après, et — le jour où on le construira — un retour en
 * arrière qui défait un acte au lieu d'effacer une ligne.
 *
 * ## La forme d'un item
 *
 * `item_type` est un texte libre en base ; on y met la **provenance** de
 * l'affirmation, comme les autres chemins de la mémoire : `base-datum`. La
 * nature réelle — contrainte, donnée de base — voyage dans le `payload`, et
 * c'est elle qui prime à la lecture (`classifyAssertion`).
 *
 * `item_key` est l'identité métier : le sujet, jamais la valeur. C'est ce qui
 * fait qu'une valeur nouvelle **remplace** l'ancienne au lieu de coexister avec
 * elle. La portée en fait partie — le degré du bâtiment A ne périme pas celui
 * du bâtiment B.
 */

import { normalizeSubjectKey } from "./project-memory.js";
import { normalizeZoneKey } from "./project-zones.js";
import { BASE_DATUM_KIND } from "./assertion-taxonomy.js";
import { OPERATEURS, PROVENANCES, STATUTS } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une affirmation prête à être proposée.
 *
 * @typedef {object} AffirmationDAtelier
 * @property {string} sujet     « Degré coupe-feu des planchers »
 * @property {string} valeur    « CF 1/2 h »
 * @property {string} [nature]  contrainte, donnée de base…
 * @property {string} [domaine] incendie, structure…
 * @property {string} [source]  « arrêté du 31 janvier 1986 modifié »
 * @property {string} [article] « article 6, premier alinéa »
 * @property {string} [citation] la phrase du texte qui décide
 * @property {string} [reference] l'identifiant stable côté utilitaire
 * @property {string[]} [zones] la portée, vide pour l'ensemble
 */

/**
 * La provenance qu'on garde : son type, et ce qu'elle désigne.
 *
 * Un type inconnu n'entre pas. La liste des six est fermée — texte, document,
 * calcul, règle, décision, hypothèse — parce que c'est elle qui dit **comment**
 * la valeur a été obtenue : un septième type inventé ici ne se relirait nulle
 * part, et l'écriture le rendrait comme une provenance qu'aucun écran ne sait
 * colorer.
 */
export function provenanceRetenue(provenance) {
  if (!provenance || typeof provenance !== "object") return null;

  const type = texte(provenance.type);
  const quoi = texte(provenance.quoi);
  if (!PROVENANCES.includes(type) || !quoi) return null;

  return { type, quoi };
}

/**
 * Ce qu'on garde d'une règle : ses conditions, ce qu'elle pose, ce qui la borne.
 *
 * On ne stocke que ce que l'écriture Mdall rend. Le reste dormirait dans la
 * base sans jamais s'afficher, et finirait par diverger de ce qui s'affiche.
 *
 * `alors` n'y est pas : c'est ce que la règle conclut, que `payload.value` porte
 * déjà. Une valeur écrite à deux endroits finit par diverger — l'écriture la
 * reconstruit à la lecture, comme elle le fait pour une affirmation.
 *
 * Les dépendances non plus : elles sont les sujets des conditions, et les
 * recopier les laisserait diverger le jour où quelqu'un modifie la règle.
 */
export function regleRetenue(regle) {
  if (!regle || typeof regle !== "object") return null;

  const conditions = (Array.isArray(regle.conditions) ? regle.conditions : [])
    .map(conditionRetenue).filter(Boolean);
  const sauf = (Array.isArray(regle.sauf) ? regle.sauf : []).map(conditionRetenue).filter(Boolean);
  const sinon = texte(regle.sinon);

  if (!conditions.length && !sauf.length && !sinon) return null;
  return { conditions, sinon, sauf };
}

/** Une condition : un sujet, un comparateur connu, ce à quoi il compare. */
function conditionRetenue(condition) {
  if (!condition || typeof condition !== "object") return null;

  const sujet = texte(condition.sujet);
  if (!sujet) return null;

  const operateur = OPERATEURS.includes(texte(condition.operateur)) ? texte(condition.operateur) : "=";
  const valeur = (Array.isArray(condition.valeur) ? condition.valeur : [condition.valeur])
    .map(texte).filter(Boolean);

  return {
    sujet,
    operateur,
    valeur,
    unite: texte(condition.unite),
    logique: condition.logique === true,
    ...(texte(condition.joint) ? { joint: texte(condition.joint) } : {})
  };
}

/** La clé métier d'une affirmation, portée comprise. */
export function cleDAffirmation(affirmation) {
  const base = normalizeSubjectKey(affirmation?.sujet ?? "");
  const portees = [...new Set((affirmation?.zones ?? []).map(normalizeZoneKey).filter(Boolean))].sort();
  const cle = portees.length ? `${base}@${portees.join("+")}` : base;

  // Une règle et la contrainte qu'elle produit portent le même sujet. Sans
  // préfixe, elles partageraient la même clé, et verser l'une périmerait
  // l'autre — la règle effacerait sa propre conclusion.
  return affirmation?.referentiel === true ? `regle:${cle}` : cle;
}

/**
 * Les items d'une proposition, à partir de ce que l'Atelier a produit.
 *
 * Une affirmation sans sujet ou sans valeur n'entre pas : elle n'affirmerait
 * rien, et une proposition qui porte des lignes vides ne se relit pas.
 */
export function itemsDeProposition(affirmations = []) {
  return (Array.isArray(affirmations) ? affirmations : [])
    .filter((affirmation) => texte(affirmation?.sujet) && texte(affirmation?.valeur))
    .map((affirmation) => {
      const portees = [...new Set((affirmation.zones ?? []).map(normalizeZoneKey).filter(Boolean))].sort();

      return {
        itemType: BASE_DATUM_KIND,
        itemKey: cleDAffirmation(affirmation),
        payload: {
          subject: texte(affirmation.sujet),
          value: texte(affirmation.valeur),
          // La nature et le domaine ne se devinent pas : c'est l'utilitaire qui
          // sait de quoi il parle, et il le dit.
          nature: texte(affirmation.nature) || null,
          domain: texte(affirmation.domaine) || null,
          zones: portees.length ? portees : null,
          // De quoi rouvrir le texte à la bonne ligne devant qui conteste.
          source: texte(affirmation.source) || null,
          article: texte(affirmation.article) || null,
          citation: texte(affirmation.citation) || null,
          reference: texte(affirmation.reference) || null,
          // D'où elle vient. Six mois plus tard, personne ne saura si une cote a
          // été dimensionnée à la main ou proposée par un calcul.
          atelier: texte(affirmation.atelier) || null,
          // Et si elle sort d'un calcul : lequel, et avec quelles entrées. La
          // ligne l'écrit derrière une double flèche — c'est ce qui permettra,
          // le jour où une entrée change, de savoir quoi refaire sans chercher.
          deduitDe: affirmation.deduitDe ?? null,
          // D'où elle vient, et donc comment elle a été obtenue : le type de
          // la provenance **est** l'origine. Une valeur qui renvoie à une règle
          // est déduite, une valeur qui renvoie à un plan est lue, une valeur
          // qui renvoie à un calcul est calculée.
          provenance: provenanceRetenue(affirmation.provenance),
          // Et l'état du raisonnement dans ce projet : retenu, supposé,
          // contesté. Ce n'est pas une propriété de la valeur, c'est ce que le
          // projet en fait — et les confondre fait qu'on ne sait plus ce qui
          // était acquis et ce qui restait à confirmer.
          statut: STATUTS.includes(texte(affirmation.statut)) ? texte(affirmation.statut) : null,
          // Une **règle appliquée**, quand c'en est une. Le projet en garde un
          // instantané : sans lui, « ← règle Classement du bâtiment » pointerait
          // vers rien, le graphe ne se reconstruirait pas, et un arrêté modifié
          // six mois plus tard réécrirait l'histoire en silence.
          referentiel: affirmation.referentiel === true ? true : null,
          regle: regleRetenue(affirmation.regle)
        }
      };
    });
}

/**
 * Le corps d'une proposition, écrit pour être relu.
 *
 * Une proposition dont la description dit « 12 affirmations » demande d'ouvrir
 * chaque ligne pour savoir de quoi il s'agit. Celle-ci les liste, avec leur
 * article : c'est ce qu'on lit avant de signer.
 */
export function descriptionDeLaProposition({ intro = "", affirmations = [], source = "" } = {}) {
  const lignes = [];
  if (texte(intro)) lignes.push(texte(intro), "");

  for (const affirmation of affirmations) {
    if (!texte(affirmation?.sujet) || !texte(affirmation?.valeur)) continue;
    const suite = [texte(affirmation.article), (affirmation.zones ?? []).join(", ")]
      .filter(Boolean).join(" · ");
    lignes.push(`- **${texte(affirmation.sujet)}** : ${texte(affirmation.valeur)}${suite ? ` — ${suite}` : ""}`);
  }

  if (texte(source)) lignes.push("", `_${texte(source)}_`);
  lignes.push("", "_Rien n'est encore entré dans la mémoire du projet : cette proposition attend d'être signée._");
  return lignes.join("\n");
}

/**
 * Ouvrir une proposition à partir d'un résultat d'Atelier.
 *
 * **Elle reste ouverte.** Rien ici ne la fusionne, et c'est le point de tout ce
 * fichier : le système prépare, l'humain signe.
 *
 * `affirmations` accepte aussi des **items déjà formés** — c'est ce que fait un
 * retrait, qui ne décrit pas une valeur mais un document à sortir du corpus.
 *
 * @returns {Promise<{ok: true, proposition: object, items: number}|{ok: false, raison: string}>}
 */
export async function preparerUneProposition({
  projectId = "",
  titre = "",
  intro = "",
  source = "",
  affirmations = [],
  // Une description écrite par l'appelant. Elle sert quand ce qu'il y a à dire
  // n'est pas une liste de valeurs — défaire une proposition raconte ce qu'on
  // remet, ce qu'on écarte et ce qu'on laisse.
  description = "",
  // À quelles parties de l'ouvrage tout ceci s'applique. Une liste vide veut
  // dire « partout » — c'est une portée, pas une absence de réponse.
  //
  // Elle ne s'impose qu'à ce qui n'a pas déjà la sienne : un utilitaire qui
  // sait où va chacune de ses conclusions garde le dernier mot.
  zones = null
} = {}) {
  const projet = texte(projectId);
  if (!projet) return { ok: false, raison: "Ce projet n'est pas relié à la base." };

  const portees = Array.isArray(zones) ? zones : null;
  const situees = portees === null
    ? affirmations
    : (Array.isArray(affirmations) ? affirmations : []).map((affirmation) => (
        Array.isArray(affirmation?.zones) && affirmation.zones.length
          ? affirmation
          : { ...affirmation, zones: portees }
      ));

  const items = Array.isArray(situees) && situees.length && situees[0]?.itemType
    ? situees
    : itemsDeProposition(situees);
  if (!items.length) return { ok: false, raison: "Il n'y a rien à proposer." };

  const { createProposition, soumettreDesItems } = await import("./propositions-supabase.js");

  const proposition = await createProposition({
    projectId: projet,
    title: texte(titre) || "Proposition depuis l'Atelier",
    description: texte(description) || descriptionDeLaProposition({ intro, affirmations, source })
  });
  if (!proposition?.id) return { ok: false, raison: "La proposition n'a pas pu être ouverte." };

  const soumis = await soumettreDesItems({ propositionId: proposition.id, projectId: projet, items });
  if (!soumis) {
    // La proposition existe et elle est vide : le dire vaut mieux que de laisser
    // croire qu'elle porte ce qu'on vient de préparer.
    return { ok: false, raison: "La proposition a été ouverte, mais ses lignes n'ont pas pu y être portées." };
  }

  return { ok: true, proposition, items: items.length };
}
