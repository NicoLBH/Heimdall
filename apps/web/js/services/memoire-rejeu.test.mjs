import test from "node:test";
import assert from "node:assert/strict";

import { TOURS_MAX, porteesDuRejeu, rejouerLesRegles } from "./memoire-rejeu.js";
import { OPERATEUR } from "./memoire-en-texte.js";

/** Une règle appliquée, avec sa portée. */
const regle = (sujet, alors, conditions, { zones = null, sinon = "", id = null } = {}) => ({
  id: id ?? `r-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null, zones,
  payload: {
    subject: sujet, value: alors, referentiel: true, ...(zones ? { zones } : {}),
    regle: { conditions, sinon, sauf: [] }
  }
});

/** Une valeur du projet. */
const dit = (sujet, valeur, { zones = null, id = null } = {}) => ({
  id: id ?? `a-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  subject_key: sujet, status: "assumed", superseded_by: null, zones,
  payload: { subject: sujet, value: valeur, ...(zones ? { zones } : {}) }
});

const egal = (sujet, valeur) => ({ sujet, operateur: OPERATEUR.EGAL, valeur });
const auPlus = (sujet, valeur, unite) => ({ sujet, operateur: OPERATEUR.AU_PLUS, valeur, unite });

test("un rejeu à blanc sur des valeurs inchangées ne conclut rien de nouveau", () => {
  // C'est la propriété qui fera l'audit de l'étape 5 : une différence sur des
  // entrées inchangées est un défaut de la mémoire.
  const memoire = [
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")]),
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [egal("Classement", "3e famille B")]),
    dit("Degré CF", "CF 1 h")
  ];

  const rendu = rejouerLesRegles(memoire);
  assert.deepEqual(rendu.conclusions, []);
  assert.deepEqual(rendu.indecidables, []);
});

test("une mémoire qui a dérivé se dénonce d'elle-même", () => {
  // La hauteur a été corrigée sans que l'aval suive : le classement affirmé
  // n'est plus celui que la règle conclut.
  const memoire = [
    dit("Hauteur", "31 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B")
  ];

  const rendu = rejouerLesRegles(memoire);
  assert.equal(rendu.conclusions.length, 1);
  assert.equal(rendu.conclusions[0].avant, "3e famille B");
  assert.equal(rendu.conclusions[0].apres, "4e famille");
  assert.equal(rendu.conclusions[0].sortie.id, "a-Classement");
});

test("une substitution se propage de règle en règle", () => {
  const memoire = [
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [egal("Classement", "3e famille B")], { sinon: "CF 1 h 1/2" }),
    dit("Degré CF", "CF 1 h")
  ];

  const rendu = rejouerLesRegles(memoire, { substitutions: new Map([["a-Hauteur", "31 m"]]) });

  const parSujet = new Map(rendu.conclusions.map((c) => [c.sujet, c]));
  assert.equal(parSujet.get("Classement").apres, "4e famille");
  // Deux pas : le classement bouge, et le degré qui le lit bouge avec lui.
  assert.equal(parSujet.get("Degré CF").apres, "CF 1 h 1/2");
  assert.equal(parSujet.get("Degré CF").avant, "CF 1 h");
});

test("la trace dit ce que la règle a lu pour conclure", () => {
  // Une valeur nouvelle sans sa trace est une affirmation qu'il faut croire sur
  // parole.
  const memoire = [
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B")
  ];

  const rendu = rejouerLesRegles(memoire, { substitutions: new Map([["a-Hauteur", "31 m"]]) });
  assert.deepEqual(rendu.conclusions[0].trace.map((c) => [c.sujet, c.lu, c.verite]), [["Hauteur", "31 m", false]]);
});

test("une règle qu'on ne peut pas évaluer est nommée, jamais conclue", () => {
  const memoire = [
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B")
  ];

  const rendu = rejouerLesRegles(memoire);
  assert.deepEqual(rendu.conclusions, []);
  assert.equal(rendu.indecidables.length, 1);
  assert.deepEqual(rendu.indecidables[0].manquants, ["Hauteur"]);
});

test("chaque zone se rejoue seule, et n'emprunte rien à sa voisine", () => {
  const memoire = [
    dit("Hauteur", "26 m", { zones: ["batiment-a"] }),
    dit("Hauteur", "31 m", { zones: ["batiment-b"] }),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { zones: ["batiment-a"], sinon: "4e famille" }),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { zones: ["batiment-b"], sinon: "4e famille" }),
    dit("Classement", "3e famille B", { zones: ["batiment-a"] }),
    dit("Classement", "3e famille B", { zones: ["batiment-b"] })
  ];

  const rendu = rejouerLesRegles(memoire);

  // Le bâtiment A tient ; le bâtiment B a dérivé, et lui seul.
  assert.equal(rendu.conclusions.length, 1);
  assert.equal(rendu.conclusions[0].zone, "batiment-b");
  assert.equal(rendu.conclusions[0].sortie.id, "a-Classement@batiment-b");
  assert.equal(rendu.conclusions[0].apres, "4e famille");
});

test("une valeur portée l'emporte sur une valeur qui vaut partout", () => {
  const memoire = [
    dit("Hauteur", "26 m"),
    dit("Hauteur", "31 m", { zones: ["batiment-b"] }),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { zones: ["batiment-b"], sinon: "4e famille" }),
    dit("Classement", "3e famille B", { zones: ["batiment-b"] })
  ];

  const rendu = rejouerLesRegles(memoire);
  assert.equal(rendu.conclusions[0].apres, "4e famille");
});

test("les portées à rejouer sont celles des règles, et « partout »", () => {
  const memoire = [
    regle("A", "x", [], { zones: ["batiment-a"] }),
    regle("B", "y", [])
  ];
  assert.deepEqual(porteesDuRejeu(memoire).sort(), ["", "batiment-a"]);
});

test("un cycle s'arrête, se dit, et ne rend rien", () => {
  // A prend le contraire de B, B recopie A : le calcul oscille sans fin. Les
  // valeurs qu'il traverse ne sont pas des conclusions, et en montrer une ferait
  // passer un état de passage pour un résultat.
  const memoire = [
    dit("A", "1"),
    dit("B", "1"),
    regle("A", "2", [egal("B", "1")], { sinon: "1" }),
    regle("B", "1", [egal("A", "1")], { sinon: "2" })
  ];

  const rendu = rejouerLesRegles(memoire);

  assert.equal(rendu.borne, true);
  assert.ok(rendu.tours > TOURS_MAX);
  assert.deepEqual(rendu.conclusions, []);
  assert.equal(rendu.cycles.length, 1);
  assert.equal(rendu.cycles[0].zone, "");
});

test("un cycle dans une zone n'emporte pas les conclusions des autres", () => {
  const memoire = [
    dit("A", "1", { zones: ["batiment-a"] }),
    dit("B", "1", { zones: ["batiment-a"] }),
    regle("A", "2", [egal("B", "1")], { zones: ["batiment-a"], sinon: "1" }),
    regle("B", "1", [egal("A", "1")], { zones: ["batiment-a"], sinon: "2" }),

    dit("Hauteur", "31 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B")
  ];

  const rendu = rejouerLesRegles(memoire);
  assert.equal(rendu.cycles.length, 1);
  assert.deepEqual(rendu.conclusions.map((c) => c.sujet), ["Classement"]);
});

test("ce qui a été remplacé ne se rejoue pas", () => {
  const memoire = [
    dit("Hauteur", "31 m"),
    { ...regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
      superseded_by: "r-neuve" },
    dit("Classement", "3e famille B")
  ];
  assert.deepEqual(rejouerLesRegles(memoire).conclusions, []);
});
