import test from "node:test";
import assert from "node:assert/strict";

import { conditionsMontrables, sujetsDesFaits, unitesDesFaits } from "./conditions.js";
import { CORPUS, consulter } from "./corpus.js";
import { QUESTIONS } from "./questions.js";

const sujets = sujetsDesFaits(CORPUS, QUESTIONS);
const unites = unitesDesFaits(QUESTIONS, CORPUS);

test("un seuil du texte se publie tel quel, jamais la cote du projet", () => {
  const conditions = conditionsMontrables(
    { hauteurPlancherBasLogementLePlusHaut: { auPlus: 28 } },
    sujets, unites
  );

  assert.deepEqual(conditions, [{
    fait: "hauteurPlancherBasLogementLePlusHaut",
    sujet: "Hauteur du plancher bas du logement le plus haut",
    operateur: "≤",
    valeur: 28,
    unite: "m",
    logique: false
  }]);
});

test("chaque opérateur du moteur a son signe", () => {
  const signes = (exigence) => conditionsMontrables({ etagesSurRdc: exigence }, sujets, unites)
    .map((condition) => condition.operateur);

  assert.deepEqual(signes({ auPlus: 7 }), ["≤"]);
  assert.deepEqual(signes({ auMoins: 2 }), ["≥"]);
  assert.deepEqual(signes({ plusDe: 8 }), [">"]);
  assert.deepEqual(signes({ moinsDe: 3 }), ["<"]);
  assert.deepEqual(signes({ differentDe: "x" }), ["≠"]);
  assert.deepEqual(signes(["a", "b"]), ["parmi"]);
  assert.deepEqual(signes({ renseigne: true }), ["renseigné"]);
});

test("une fourchette donne deux comparaisons, pas une", () => {
  const conditions = conditionsMontrables({ etagesSurRdc: { auMoins: 3, auPlus: 7 } }, sujets, unites);
  assert.deepEqual(conditions.map((c) => [c.operateur, c.valeur]), [["≥", 3], ["≤", 7]]);
});

test("un booléen se lit oui ou non, et se marque comme logique", () => {
  const [oui] = conditionsMontrables({ logementsSuperposes: true }, sujets, unites);
  assert.equal(oui.valeur, "oui");
  assert.equal(oui.logique, true);

  const [non] = conditionsMontrables({ logementsSuperposes: false }, sujets, unites);
  assert.equal(non.valeur, "non");
});

test("le sujet vient du module qui produit le fait, sinon de la question", () => {
  assert.equal(sujets.get("classement"), "Classement du bâtiment");
  // Le nom court, pas la phrase interrogative : « si Le bâtiment comporte-t-il
  // des logements superposés ? = oui » ne se lit pas.
  assert.equal(sujets.get("logementsSuperposes"), "Logements superposés");
  // Un libellé déjà nominal se suffit et ne déclare pas de sujet.
  assert.equal(sujets.get("etagesSurRdc"), "Nombre d'étages sur rez-de-chaussée");
});

test("toute question interrogative porte un sujet, aucune question nominale n'en porte", () => {
  const interrogative = (question) => /\?\s*$/.test(question.libelle);

  const sansSujet = QUESTIONS.filter((question) => interrogative(question) && !question.sujet);
  assert.deepEqual(sansSujet.map((question) => question.cle), [],
    "une question interrogative sans nom court se lirait comme une question dans une condition");

  const enTrop = QUESTIONS.filter((question) => !interrogative(question) && question.sujet);
  assert.deepEqual(enTrop.map((question) => question.cle), [],
    "un libellé nominal est déjà le sujet : le redire finirait par diverger");
});

test("une étude réelle publie les conditions de la branche empruntée, et elles seules", () => {
  const vue = consulter({
    logementsSuperposes: true,
    etagesSurRdc: 9,
    hauteurPlancherBasLogementLePlusHaut: 26,
    hauteurPlancherBasNiveauLePlusHaut: 26,
    distancePortePaliereEscalier: 12,
    voieAccesDecrite: false
  });

  const conclus = vue.modules.filter((module) => module.statut === "conclu" && module.conditions.length);
  assert.ok(conclus.length > 0, "aucune condition publiée");

  for (const module of conclus) {
    for (const condition of module.conditions) {
      // Un sujet, pas une clé technique : le fichier se lit en réunion.
      assert.ok(condition.sujet && condition.sujet !== condition.fait,
        `« ${condition.fait} » n'a pas de sujet lisible`);
      assert.ok(condition.operateur, "une condition sans opérateur ne se lit pas");
    }
  }

  // Un module en attente n'a pas emprunté de branche : il ne publie rien.
  for (const module of vue.modules.filter((m) => m.statut !== "conclu")) {
    assert.deepEqual(module.conditions, []);
  }
});
