/**
 * Ce qu'on donne à lire au moteur.
 *
 * Le moteur (`depot-reperes.js`) ne sait rien des avis, des articles ni des
 * comptes rendus : il compare des repères. Ce fichier est la liste des matières
 * qu'on sait aujourd'hui transformer en repères — et **c'est le seul endroit à
 * toucher** pour en ajouter une.
 *
 * ## Ajouter un carburant
 *
 * Une entrée dans `CARBURANTS`, avec une fonction qui rend `{ avant, apres }`.
 * Rien d'autre : ni écran à écrire, ni cas à ajouter dans le rendu. C'est la
 * raison d'être de la séparation — un CCTP de trois cents pages, un compte
 * rendu de chantier, une notice de vente entrent par la même porte que le
 * rapport de bureau de contrôle.
 *
 * Ce qu'un nouveau carburant doit fournir, et c'est tout ce qui compte :
 *
 * - une **identité stable** par unité. Le numéro d'article, le rang du point à
 *   l'ordre du jour, la référence du lot. Sans elle, il n'y a pas de
 *   comparaison possible — seulement une juxtaposition, et il vaut mieux le
 *   dire que de fabriquer un écart entre deux choses qui ne se correspondent
 *   pas ;
 * - un **chemin**, qui devient sa place dans l'arborescence ;
 * - des **champs nommés**, qui sont ce qu'on relit quand quelque chose bouge.
 *
 * ## Ce qui n'a pas d'identité
 *
 * Un document qui entre au corpus n'a pas d'état antérieur : il n'existait pas.
 * Il apparaît donc en ajout, jamais en modification — et c'est exact. On ne
 * fabrique pas un « avant » pour faire joli.
 */

import { ETAT } from "./depot-reperes.js";
import { ITEM_TYPE, STATUS_LABELS } from "./proposition-review.js";
import { cheminDeRangement, extensionDeRangement } from "./memoire-rangement.js";
import {
  enClair, ligneDAffirmation, ligneDeDonnee, ligneDeCondition, ligneDeConsequence,
  ligneDeProvenance, ligneDePreuve, ligneDeStatut, ligneDeDate
} from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();
const lisible = (valeur) => STATUS_LABELS[texte(valeur)] ?? texte(valeur);

/**
 * Les avis d'un rapport de bureau de contrôle.
 *
 * L'avis porte une référence — c'est son identité, et elle traverse les
 * rapports. Un avis « ajouté » n'a pas d'avant ; un avis « modifié » en a un,
 * que le lot a lu dans le suivi.
 */
export function reperesDAvis(items = []) {
  const avis = (Array.isArray(items) ? items : []).filter((item) => item?.itemType === ITEM_TYPE.AVIS);

  const avant = [];
  const apres = [];

  for (const item of avis) {
    const payload = item.payload ?? {};
    // Un avis est un constat : observé, à une date, par quelqu'un. Il suit la
    // même politique de rangement que le reste.
    const chemin = cheminDeRangement({ nature: "constat", domain: payload.domain });
    const titre = texte(payload.reference)
      ? `Avis ${texte(payload.reference)}${texte(payload.title) ? ` — ${texte(payload.title)}` : ""}`
      : texte(payload.title) || "Avis relevé sur une fiche";

    const commun = {
      id: `avis:${texte(item.itemKey)}`,
      famille: "avis",
      chemin,
      titre,
      provenance: {
        documentId: payload.sourceId ?? null,
        page: payload.page ?? null,
        extrait: typeof payload.evidence === "string" ? payload.evidence : payload.evidence?.text ?? null
      }
    };

    // Un avis « ajouté » n'avait pas d'état : ne pas lui en inventer un est ce
    // qui fait que le signe « + » veut dire quelque chose.
    if (texte(payload.change) === "changed") {
      avant.push({
        ...commun,
        champs: { "État": lisible(payload.previousStatus), "Appréciation": texte(payload.previousOpinion) }
      });
    }

    apres.push({
      ...commun,
      champs: { "État": lisible(payload.status), "Appréciation": texte(payload.opinion) }
    });
  }

  return { avant, apres };
}

/**
 * Les affirmations que la proposition porte.
 *
 * ## Un champ est une ligne du fichier, pas une case d'un tableau
 *
 * Les champs s'appelaient « Valeur », « Règle », « D'où », « Statut », et le
 * diff les rendait tous de la même façon : `Sujet · Champ = valeur`. Une règle
 * s'y lisait donc exactement comme une contrainte, et l'on ne voyait plus
 * aucune règle.
 *
 * Chaque champ **est** maintenant une ligne du fichier, écrite dans la langue :
 * `si Logements superposés = oui`, `texte: arrêté …`, `statut: retenu`. Le diff
 * d'un `.ref` ressemble donc à un `.ref`, et celui d'un `.ctr` à un `.ctr` —
 * ce qui est la moindre des choses, puisque c'est le même fichier.
 *
 * ## Le nom d'un champ est son identité, pas son rang
 *
 * Une condition se nomme par son **sujet** : `si Hauteur du plancher bas`. Deux
 * conditions réordonnées ne produisent donc aucun changement, et une condition
 * ajoutée produit exactement une ligne ajoutée. Numérotées, elles auraient
 * toutes bougé au premier ajout.
 *
 * Elles arrivent déjà comparées — le tableau avant / après les a mises face à
 * face, et il connaît le point délicat : sur une proposition fusionnée,
 * « avant » n'est pas l'état d'aujourd'hui mais ce que l'écriture a remplacé.
 * Refaire ce calcul ici le ferait diverger de là-bas.
 */
export function reperesDAffirmations(tableau = null) {
  const lignes = tableau?.lignes ?? [];
  const avant = [];
  const apres = [];

  for (const ligne of lignes) {
    const referentiel = ligne.referentiel === true;
    const commun = {
      id: `affirmation:${texte(ligne.cle)}`,
      famille: "affirmation",
      // Zone puis domaine, et l'extension dit la nature. Voir
      // `memoire-rangement.js` : on cherche par le morceau d'ouvrage qu'on a en
      // tête, pas par la famille de l'information.
      chemin: cheminDeRangement({ nature: ligne.nature, domain: ligne.domaine, referentiel }),
      extension: extensionDeRangement({ nature: ligne.nature, referentiel }),
      titre: texte(ligne.sujet) || texte(ligne.cle),
      provenance: {
        source: texte(ligne.source) || null,
        article: texte(ligne.article) || null,
        zones: Array.isArray(ligne.zones) ? ligne.zones : [],
        deduitDe: ligne.deduitDe ?? null
      }
    };

    if (texte(ligne.avant)) {
      avant.push({ ...commun, champs: champsDuBloc({
        sujet: commun.titre, valeur: ligne.avant, referentiel,
        regle: ligne.regleAvant, provenance: ligne.provenanceAvant,
        preuve: ligne.preuveAvant, statut: ligne.statutAvant, le: ligne.leAvant
      }) });
    }
    if (texte(ligne.apres)) {
      apres.push({ ...commun, champs: champsDuBloc({
        sujet: commun.titre, valeur: ligne.apres, referentiel,
        regle: ligne.regle, provenance: ligne.provenance,
        preuve: ligne.preuve, statut: ligne.statut, le: ligne.le
      }) });
    }
  }

  return { avant, apres };
}

/**
 * Un bloc, découpé en lignes nommées — c'est ce que le diff compare.
 *
 * La valeur d'un champ est la **ligne mdall entière**, sans son indentation :
 * l'écran n'a plus qu'à la colorer, et il colore exactement ce que le fichier
 * montre. Une ligne vide ne s'écrit pas : elle apparaîtrait comme un retrait le
 * jour où une affirmation se met à porter sa source.
 */
export function champsDuBloc({
  sujet = "", valeur = "", referentiel = false,
  regle = null, provenance = null, preuve = "", statut = "", le = ""
} = {}) {
  const champs = {};
  // L'indentation reste : c'est elle qui dit à quelle ligne une ligne se
  // rapporte, et le diff doit ressembler au fichier.
  const poser = (nom, jetons) => { if (jetons) champs[nom] = enClair(jetons); };

  const conditions = Array.isArray(regle?.conditions) ? regle.conditions : [];
  const exceptions = Array.isArray(regle?.sauf) ? regle.sauf : [];

  if (referentiel) {
    // La tête d'une règle : la donnée et ses entrées, sans valeur de projet.
    poser("", ligneDeDonnee(sujet, [...conditions, ...exceptions].map((c) => c?.sujet)));
    conditions.forEach((condition, rang) => {
      poser(`si ${texte(condition?.sujet)}`, ligneDeCondition(rang === 0 ? "si" : (condition.joint || "et"), condition));
    });
    if (texte(valeur)) poser("alors", ligneDeConsequence("alors", texte(valeur)));
    if (texte(regle?.sinon)) poser("sinon", ligneDeConsequence("sinon", texte(regle.sinon)));
    for (const exception of exceptions) {
      poser(`sauf si ${texte(exception?.sujet)}`, ligneDeCondition("sauf si", exception));
    }
  } else {
    poser("", ligneDAffirmation({ sujet, valeur: texte(valeur) }));
    if (texte(le)) poser("le", ligneDeDate(texte(le)));
  }

  if (provenance && texte(provenance.quoi)) poser("provenance", ligneDeProvenance(provenance));
  if (texte(preuve)) poser("parce que", ligneDePreuve(texte(preuve)));
  if (texte(statut)) poser("statut", ligneDeStatut(texte(statut)));

  return champs;
}

/**
 * Les livrables qui entrent au corpus.
 *
 * Un document n'a pas d'avant : il n'existait pas dans le projet. Il apparaît
 * donc toujours en ajout — et un document refusé, lui, en retrait.
 */
export function reperesDeDocuments(items = []) {
  const documents = (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType === ITEM_TYPE.DOCUMENT);

  const avant = [];
  const apres = [];

  for (const item of documents) {
    const payload = item.payload ?? {};
    const repere = {
      id: `document:${texte(item.itemKey)}`,
      famille: "document",
      chemin: cheminDeRangement({ nature: "intendance" }),
      titre: texte(payload.name) || texte(item.itemKey) || "Document",
      champs: {
        "Nature": texte(payload.kindLabel) || "non reconnue",
        "Auteur": texte(payload.author),
        "Émis le": texte(payload.issuedAt)
      },
      provenance: { documentId: texte(item.itemKey) || null }
    };

    // Un livrable refusé sort au lieu d'entrer : le côté gauche le porte, et le
    // diff le lit comme un retrait.
    if (texte(item.status) === "refused") avant.push(repere);
    else apres.push(repere);
  }

  return { avant, apres };
}

/**
 * Les affaires rattachées au projet, ou écartées.
 *
 * Un rattachement est un verdict sur une affaire : il n'a pas d'histoire à
 * comparer, il s'ajoute. Le verdict lui-même est le champ qu'on relit.
 */
export function reperesDeRattachements(items = []) {
  const apres = (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType === ITEM_TYPE.ATTACHMENT)
    .map((item) => {
      const payload = item.payload ?? {};
      return {
        id: `rattachement:${texte(item.itemKey)}`,
        famille: "rattachement",
        chemin: cheminDeRangement({ nature: "intendance" }),
        titre: texte(payload.label) || texte(item.itemKey) || "Affaire",
        champs: { "Verdict": texte(payload.verdict), "Raison": texte(payload.reason) },
        provenance: null
      };
    });

  return { avant: [], apres };
}

/**
 * Les matières qu'on sait lire aujourd'hui.
 *
 * L'ordre est celui de la lecture : ce que le projet retient d'abord — les
 * valeurs qu'il tiendra pour vraies —, puis les constats, puis l'intendance.
 */
export const CARBURANTS = [
  {
    famille: "affirmation",
    label: "Données de base",
    icone: "table",
    lire: (source) => reperesDAffirmations(source.avantApres)
  },
  {
    famille: "avis",
    label: "Avis",
    icone: "issue-opened",
    lire: (source) => reperesDAvis(source.items)
  },
  {
    famille: "document",
    label: "Documents",
    icone: "file",
    lire: (source) => reperesDeDocuments(source.items)
  },
  {
    famille: "rattachement",
    label: "Rattachements",
    icone: "stack",
    lire: (source) => reperesDeRattachements(source.items)
  }
];

/**
 * Tous les repères d'un dépôt, quels qu'en soient les carburants.
 *
 * @param {{items: object[], avantApres: object}} source
 * @returns {{avant: object[], apres: object[]}}
 */
export function reperesDuDepot(source = {}) {
  const avant = [];
  const apres = [];

  for (const carburant of CARBURANTS) {
    const lu = carburant.lire(source) ?? {};
    avant.push(...(lu.avant ?? []));
    apres.push(...(lu.apres ?? []));
  }

  return { avant, apres };
}

/** Ce qui a bougé, tous carburants confondus. */
export function aChange(ligne) {
  return ligne?.etat !== ETAT.INCHANGE;
}
