import test from "node:test";
import assert from "node:assert/strict";

import {
  cheminDeRangement, cheminsDeRangement, extensionDeRangement,
  EXTENSIONS, EXTENSION_REGLE, SANS_NATURE, SANS_DOMAINE, TOUT_LOUVRAGE,
  rangDeLExtension, rangDeLaZone, phraseDeLExtension, phraseDeLaZone
} from "./memoire-rangement.js";

test("l'arborescence part de la zone, parce que c'est de là qu'on part", () => {
  // « l'escalier B, l'incendie, ce qui a été relevé » — et non l'inverse.
  assert.deepEqual(cheminDeRangement({ domain: "incendie", zones: ["Escalier B"] }), ["Escalier B", "Incendie"]);
  assert.equal(extensionDeRangement({ nature: "donnee-de-base" }), "ddb");
});

test("ce qui n'a pas de zone vaut pour tout l'ouvrage : c'est une portée, pas un manque", () => {
  assert.deepEqual(cheminDeRangement({ domain: "structure" }), [TOUT_LOUVRAGE, "Structure"]);
  assert.match(phraseDeLaZone(TOUT_LOUVRAGE), /l'ensemble du projet/);
  assert.match(phraseDeLaZone("Escalier B"), /pour Escalier B/);
});

test("une affirmation qui vaut pour deux zones se lit dans les deux fichiers", () => {
  assert.deepEqual(cheminsDeRangement({ domain: "incendie", zones: ["Escalier A", "Escalier B"] }), [
    ["Escalier A", "Incendie"],
    ["Escalier B", "Incendie"]
  ]);
  // Sans zone, un seul fichier : celui de l'ouvrage entier.
  assert.deepEqual(cheminsDeRangement({ domain: "incendie" }), [[TOUT_LOUVRAGE, "Incendie"]]);
  // Deux fois la même zone ne fait pas deux fichiers.
  assert.equal(cheminsDeRangement({ domain: "incendie", zones: ["A", "A"] }).length, 1);
});

test("l'extension dit la nature, et une nature inconnue ne s'invente pas", () => {
  assert.equal(extensionDeRangement({ nature: "contrainte" }), EXTENSIONS.contrainte);
  assert.equal(extensionDeRangement({ nature: "hypothese" }), "hyp");
  assert.equal(extensionDeRangement({ nature: "constat" }), "cst");
  assert.equal(extensionDeRangement({ nature: "intendance" }), "crp");
  assert.equal(extensionDeRangement({}), SANS_NATURE);
  // Une règle appliquée n'a pas de nature : c'est un texte, pas un fait.
  assert.equal(extensionDeRangement({ nature: "contrainte", referentiel: true }), EXTENSION_REGLE);
});

test("un domaine inconnu se range à part plutôt que de se deviner", () => {
  assert.deepEqual(cheminDeRangement({ zones: ["Escalier B"] }), ["Escalier B", SANS_DOMAINE]);
});

test("les règles se lisent avant ce qu'on en tire", () => {
  assert.equal(rangDeLExtension(EXTENSION_REGLE), 0);
  assert.ok(rangDeLExtension("ref") < rangDeLExtension("ctr"));
  assert.ok(rangDeLExtension("ctr") < rangDeLExtension("hyp"));
  assert.equal(rangDeLaZone(TOUT_LOUVRAGE), 0);
  assert.ok(rangDeLaZone(TOUT_LOUVRAGE) < rangDeLaZone("Escalier B"));
});

test("chaque extension dit ce qu'elle contient, sans quoi on range au hasard", () => {
  assert.match(phraseDeLExtension("ref"), /règles appliquées/);
  assert.match(phraseDeLExtension("ctr"), /pas de recours/);
  assert.match(phraseDeLExtension("cst"), /Un constat sans date ne vaut rien/);
  assert.match(phraseDeLExtension("inconnue"), /ne devrait pas se remplir/);
});
