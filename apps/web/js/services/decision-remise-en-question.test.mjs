/**
 * Ce qu'une donnée nouvelle remet en question dans un choix humain.
 *
 * Le point dur de § 16 : une chaîne déterministe se refait, une chaîne qui passe
 * par un arbitrage humain bute dessus — et doit dire à qui s'adresser.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  decisionPortee,
  questionPoseeALaDecision,
  MOTIF_DECISION
} from "./decision-remise-en-question.js";
import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE } from "./memoire-en-texte.js";
import { rangementVise } from "./memoire-domiciles.js";

const SIGNATURE = {
  type: PROVENANCE.DECISION,
  quoi: "H0 retenu pour le département — tranché par Marie D., le 12 mars 2026",
  par: "Marie D.",
  le: "12 mars 2026"
};

const LA_DECISION = {
  id: "d1", nature: NATURE.DECISION, domain: "structure",
  payload: {
    subject: "H0 retenu pour le département", value: "0,50 m",
    provenance: SIGNATURE,
    decision: {
      question: "Quelle cote retenir dans la fourchette du département ?",
      ecartes: [{ quoi: "0,45 m", pourquoi: "borne basse" }, { quoi: "0,55 m", pourquoi: "" }],
      motif: "valeur médiane, faute de relevé local"
    }
  }
};

const LA_VALEUR = {
  id: "v1", nature: NATURE.DONNEE_BASE, domain: "structure",
  payload: { subject: "H0 retenu pour le département", value: "0,50 m", provenance: SIGNATURE }
};

const DEPART = [{ sujet: "Altitude du site", valeur: "13 m", vers: "800 m" }];

/* ── Reconnaître un choix humain ─────────────────────────────────────────── */

test("la décision porte sa charge, la valeur porte sa citation, les deux comptent", () => {
  // Ne regarder que la décision laisserait passer sans un mot la valeur qu'on
  // est justement en train de remettre en cause.
  assert.equal(decisionPortee(LA_DECISION).estLaDecision, true);
  assert.equal(decisionPortee(LA_VALEUR).estLaDecision, false);
  assert.equal(decisionPortee(LA_VALEUR).par, "Marie D.");
});

test("ce qui ne tient d'aucun choix humain n'en est pas un", () => {
  assert.equal(decisionPortee({ payload: { provenance: { type: PROVENANCE.CALCUL, quoi: "x" } } }), null);
  assert.equal(decisionPortee({ payload: {} }), null);
  assert.equal(decisionPortee(null), null);
});

/* ── La question, et rien qu'elle ────────────────────────────────────────── */

test("la question nomme qui, quand, ce qui a été retenu, entre quoi, et ce qui a bougé", () => {
  const pose = questionPoseeALaDecision(LA_DECISION, DEPART);

  assert.equal(pose.phrase,
    "Le 12 mars 2026, Marie D. a retenu 0,50 m entre 0,45 m et 0,55 m. "
    + "Ce choix tenait sous Altitude du site = 13 m. Tient-il encore à 800 m ?");
  assert.equal(pose.question, "Quelle cote retenir dans la fourchette du département ?");
  assert.equal(pose.par, "Marie D.");
  assert.equal(pose.retenu, "0,50 m");
  assert.equal(pose.ecartes.length, 2);
});

test("un seul écarté ne se lit pas « entre »", () => {
  const pose = questionPoseeALaDecision({
    ...LA_DECISION,
    payload: { ...LA_DECISION.payload, decision: { ...LA_DECISION.payload.decision, ecartes: [{ quoi: "0,45 m" }] } }
  }, DEPART);
  assert.match(pose.phrase, /a retenu 0,50 m plutôt que 0,45 m\./);
});

test("ce qui manque manque : ni auteur inventé, ni écartés plausibles", () => {
  // Une décision sans auteur ne se voit pas attribuer le dernier connecté, et
  // une décision sans écartés notés ne s'en voit pas offrir. La phrase est plus
  // courte, et c'est tout (règle 5).
  const nue = questionPoseeALaDecision({
    id: "d2", nature: NATURE.DECISION,
    payload: {
      subject: "Trame", value: "6,00 m",
      provenance: { type: PROVENANCE.DECISION, quoi: "Trame" },
      decision: { question: "Quelle trame ?", ecartes: [], motif: "" }
    }
  }, DEPART);

  assert.equal(nue.phrase,
    "Ici, on a retenu 6,00 m. Ce choix tenait sous Altitude du site = 13 m. Tient-il encore à 800 m ?");
  assert.equal(nue.par, "");
  assert.deepEqual(nue.ecartes, []);
});

test("sans départ nommé, la question s'arrête à ce qui avait été choisi", () => {
  // On ne prétend pas savoir ce qui a bougé quand on ne le sait pas.
  const pose = questionPoseeALaDecision(LA_DECISION, []);
  assert.equal(pose.phrase, "Le 12 mars 2026, Marie D. a retenu 0,50 m entre 0,45 m et 0,55 m.");
});

test("ce qui n'est pas un choix humain ne pose aucune question", () => {
  // `null`, et non une phrase vide : l'appelant doit pouvoir distinguer « pas ce
  // genre de doute » de « ce genre de doute, mais sans rien à dire ».
  assert.equal(questionPoseeALaDecision({ payload: { value: "A2" } }, DEPART), null);
});

/* ── Ce que le mécanisme en fait ─────────────────────────────────────────── */

test("le motif d'un choix humain se distingue des doutes ordinaires", () => {
  // C'est lui qui fait basculer l'écran vers la question adressée à quelqu'un,
  // au lieu de la phrase générale.
  assert.equal(MOTIF_DECISION, "decision");
  assert.notEqual(MOTIF_DECISION, "en-decoule");
});

test("un raisonnement se range dans un `.rai`, et transversalement", () => {
  // Il traverse les disciplines par construction : le ranger sous un domaine
  // reviendrait à choisir lequel de ses maillons le nomme. Avant cette étape,
  // il n'avait pas d'extension du tout.
  const range = rangementVise({ nature: NATURE.RAISONNEMENT, domain: "structure", payload: {} });
  assert.equal(range.extension, "rai");
  assert.equal(range.fichier, "memoire/raisonnements.rai");
});
