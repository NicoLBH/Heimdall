/**
 * Ce qu'une donnée nouvelle remet en question dans un choix humain.
 *
 * ## Le point dur, et c'est là que le produit vaut cher
 *
 * **Un raisonnement qui traverse une décision ne se rejoue pas tout seul.**
 *
 * Une chaîne déterministe se refait : mêmes entrées, même sortie. Une chaîne qui
 * passe par un arbitrage humain bute dessus. Si l'altitude change, la chaîne se
 * rejoue jusqu'à la décision — puis elle s'arrête, et elle doit dire quoi.
 *
 * Aujourd'hui elle dit « à revérifier », sans un mot. C'est un doute général :
 * on ne sait ni qui appeler, ni ce qu'il avait décidé, ni sur quoi il s'était
 * fondé. Ce fichier remplace ce doute par une question :
 *
 * > Ici, le 12 mars, Marie a retenu **0,50 m** entre 0,45 m et 0,55 m.
 * > Ce choix tenait sous une altitude de 13 m. Tient-il encore à 800 m ?
 *
 * Un nom, une date, la valeur retenue, **les possibles d'origine**, et ce qui a
 * bougé sous elle. Savoir quelles décisions humaines une donnée nouvelle remet
 * en cause est probablement ce que Mdall a de plus à offrir à un projet — et
 * personne d'autre ne le fait.
 *
 * ## Pourquoi cette question ne s'invente pas
 *
 * Chacun de ses morceaux est **lu**, aucun n'est déduit :
 *
 * | ce que la phrase dit | d'où cela vient |
 * | --- | --- |
 * | qui, quand | `payload.provenance.par` et `.le` |
 * | ce qui a été retenu | `payload.value` |
 * | entre quoi | `payload.decision.ecartes` |
 * | ce qui a bougé dessous | la valeur de départ de la variante |
 *
 * Ce qui manque **manque** : une décision sans écartés notés ne se voit pas
 * offrir des écartés plausibles, et une décision sans auteur ne se voit pas
 * attribuer le dernier connecté. La phrase est alors plus courte, et c'est tout
 * (règle 5).
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne répond pas. Il ne rejoue rien, il ne verse rien, et surtout il ne
 * **tranche** pas à la place de qui avait tranché : la seule chose qu'un
 * programme puisse faire ici est de poser la question à la bonne personne, avec
 * assez de contexte pour qu'elle y réponde en une minute.
 */

import { classifyAssertion, NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le motif d'un « à revérifier » qui bute sur un choix humain. */
export const MOTIF_DECISION = "decision";

/**
 * La décision que porte une affirmation, s'il y en a une.
 *
 * Deux lignes la portent, et il faut les deux : la **décision** elle-même —
 * elle a la question et les écartés —, et la **valeur** qu'elle a fixée, qui la
 * cite par sa provenance. Ne regarder que la première laisserait passer sans un
 * mot la valeur qu'on est justement en train de remettre en cause.
 *
 * @returns {{question, ecartes, motif, par, quand, estLaDecision}|null}
 */
export function decisionPortee(assertion = null) {
  if (!assertion) return null;

  const charge = assertion?.payload?.decision;
  const provenance = assertion?.payload?.provenance;
  const citeUneDecision = texte(provenance?.type) === PROVENANCE.DECISION;

  // La ligne de décision porte sa charge ; la valeur ne porte que la citation.
  // Une valeur qui cite une décision sans qu'on retrouve la charge reste digne
  // d'être signalée : on sait qu'un humain a tranché, même sans savoir entre quoi.
  if (!charge && !citeUneDecision) return null;

  return {
    question: texte(charge?.question),
    ecartes: Array.isArray(charge?.ecartes) ? charge.ecartes : [],
    motif: texte(charge?.motif),
    par: texte(provenance?.par),
    quand: texte(provenance?.le),
    estLaDecision: classifyAssertion(assertion).nature === NATURE.DECISION
  };
}

/** « 0,45 m » et « 0,55 m » → « entre 0,45 m et 0,55 m ». Rien si l'on n'a rien. */
function phraseDesEcartes(ecartes = []) {
  const dits = ecartes.map((ecarte) => texte(ecarte?.quoi)).filter(Boolean);
  if (!dits.length) return "";
  if (dits.length === 1) return `plutôt que ${dits[0]}`;

  return `entre ${dits.slice(0, -1).join(", ")} et ${dits[dits.length - 1]}`;
}

/** « Marie » et « 12 mars 2026 » → « le 12 mars 2026, Marie a retenu … ». */
function phraseDuChoix({ par, quand, valeur, ecartes }) {
  const qui = par ? `${par} a retenu` : "on a retenu";
  const quoi = valeur ? ` ${valeur}` : "";
  const entre = phraseDesEcartes(ecartes);

  const debut = quand ? `Le ${quand}, ${qui}` : `Ici, ${qui}`;
  return `${debut}${quoi}${entre ? ` ${entre}` : ""}.`;
}

/**
 * Ce qui a bougé sous la décision, et la question que cela pose.
 *
 * Un seul départ nommé : c'est celui qu'on essaie, et la variante n'en a qu'un
 * à la fois. Plusieurs se liraient « tenait sous A et B » sans qu'on sache
 * lequel a bougé.
 */
function phraseDeCeQuiABouge(depart = null) {
  const sujet = texte(depart?.sujet);
  const avant = texte(depart?.valeur);
  const apres = texte(depart?.vers);
  if (!sujet || !apres) return "";

  const sous = avant ? `Ce choix tenait sous ${sujet} = ${avant}.` : `Ce choix tenait sous ${sujet}.`;
  return `${sous} Tient-il encore à ${apres} ?`;
}

/**
 * La question qu'une donnée nouvelle pose à une décision.
 *
 * @param {object} assertion la ligne remise en cause — décision, ou valeur qui en cite une
 * @param {object[]} depart ce que la variante essaie, tel que `consequencesDeLaVariante` le rend
 * @returns {{question, phrase, par, quand, retenu, ecartes, motif}|null}
 *   `null` quand aucune décision n'est en jeu : ce n'est alors pas ce genre de doute.
 */
export function questionPoseeALaDecision(assertion = null, depart = []) {
  const portee = decisionPortee(assertion);
  if (!portee) return null;

  const retenu = texte(assertion?.payload?.value) || texte(assertion?.statement);
  // Le premier départ : la variante n'en varie qu'un à la fois.
  const essai = (Array.isArray(depart) ? depart : [])[0] ?? null;

  const morceaux = [
    phraseDuChoix({ par: portee.par, quand: portee.quand, valeur: retenu, ecartes: portee.ecartes }),
    phraseDeCeQuiABouge(essai)
  ].filter(Boolean);

  return {
    question: portee.question,
    par: portee.par,
    quand: portee.quand,
    retenu,
    ecartes: portee.ecartes,
    motif: portee.motif,
    // La phrase entière, prête à lire. L'écran peut aussi la recomposer de ses
    // morceaux — ils sont tous là — mais il n'a pas à savoir l'écrire.
    phrase: morceaux.join(" ")
  };
}
