import test from "node:test";
import assert from "node:assert/strict";

import {
  normaliserTopic, topicsDeLaSaisie, descriptionDeLaSaisie, aProposDeLaLigne,
  DESCRIPTION_MAX, TOPICS_MAX
} from "./projet-a-propos.js";

test("un mot-clé est une étiquette : minuscule, sans accent, sans espace", () => {
  assert.equal(normaliserTopic("Contrôle Technique"), "controle-technique");
  assert.equal(normaliserTopic("  ERP   5e catégorie "), "erp-5e-categorie");
  assert.equal(normaliserTopic("///"), "");
});

test("deux graphies du même mot-clé ne se comptent pas pour deux", () => {
  assert.deepEqual(topicsDeLaSaisie("Incendie, incendie, INCENDIE"), ["incendie"]);
  assert.deepEqual(topicsDeLaSaisie(["Contrôle Technique", "controle-technique"]), ["controle-technique"]);
});

test("la liste des mots-clés est bornée : au-delà, c'est un inventaire", () => {
  const beaucoup = Array.from({ length: TOPICS_MAX + 5 }, (_, rang) => `sujet-${rang}`);
  assert.equal(topicsDeLaSaisie(beaucoup).length, TOPICS_MAX);
});

test("la limite de la description vit ici, pas seulement dans le formulaire", () => {
  // Une limite qui ne vivrait que dans l'écran de saisie laisserait entrer une
  // description de dix mille caractères par une autre porte.
  assert.equal(descriptionDeLaSaisie("x".repeat(DESCRIPTION_MAX + 100)).length, DESCRIPTION_MAX);
  assert.equal(descriptionDeLaSaisie("  Encoder la mémoire  "), "Encoder la mémoire");
});

test("une colonne absente n'est pas une erreur : le projet n'a rien dit, c'est tout", () => {
  assert.deepEqual(aProposDeLaLigne({}), { description: "", topics: [] });
  assert.deepEqual(aProposDeLaLigne({ description: "Un projet", topics: ["Incendie"] }),
    { description: "Un projet", topics: ["incendie"] });
  // `topics` en `null` — une base pas encore migrée — se lit comme une absence.
  assert.deepEqual(aProposDeLaLigne({ description: "x", topics: null }).topics, []);
});
