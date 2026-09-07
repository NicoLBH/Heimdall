import test from "node:test";
import assert from "node:assert/strict";

import {
  cheminDeRangement, extensionDeRangement, zonesDeRangement,
  EXTENSIONS, EXTENSION_REGLE, SANS_NATURE, SANS_DOMAINE, MEMOIRE, DOCUMENTS,
  rangDeLExtension, rangDeLaZone, rangDeLaRacine,
  phraseDeLExtension, phraseDeLaRacine
} from "./memoire-rangement.js";
import { TOUTES_ZONES } from "./memoire-en-texte.js";

test("ce qui est observé est transversal, ce qui est déduit est par domaine", () => {
  // Une mesure appartient au bâtiment, pas à une discipline : la dupliquer par
  // domaine violerait la règle 4.
  assert.deepEqual(cheminDeRangement({ nature: "donnee-de-base", domain: "structure" }), [MEMOIRE, "Données de base"]);
  assert.deepEqual(cheminDeRangement({ nature: "hypothese", domain: "sol" }), [MEMOIRE, "Hypothèses"]);
  assert.deepEqual(cheminDeRangement({ nature: "intendance" }), [MEMOIRE, "Corpus"]);

  // Une règle et une contrainte viennent d'un corpus, donc d'un domaine.
  assert.deepEqual(cheminDeRangement({ nature: "contrainte", domain: "incendie" }), [MEMOIRE, "Incendie"]);
  assert.deepEqual(cheminDeRangement({ nature: "constat", domain: "incendie" }), [MEMOIRE, "Incendie"]);
  assert.deepEqual(cheminDeRangement({ nature: "contrainte", domain: "incendie", referentiel: true }), [MEMOIRE, "Incendie"]);
});

test("l'extension dit la nature, et une nature inconnue ne s'invente pas", () => {
  assert.equal(extensionDeRangement({ nature: "contrainte" }), EXTENSIONS.contrainte);
  assert.equal(extensionDeRangement({ nature: "donnee-de-base" }), "ddb");
  assert.equal(extensionDeRangement({ nature: "hypothese" }), "hyp");
  assert.equal(extensionDeRangement({ nature: "constat" }), "cst");
  assert.equal(extensionDeRangement({ nature: "intendance" }), "crp");
  assert.equal(extensionDeRangement({}), SANS_NATURE);
  // Une règle appliquée n'a pas de nature : c'est un texte, pas un fait.
  assert.equal(extensionDeRangement({ nature: "contrainte", referentiel: true }), EXTENSION_REGLE);
});

test("un domaine inconnu se range à part plutôt que de se deviner", () => {
  assert.deepEqual(cheminDeRangement({ nature: "contrainte" }), [MEMOIRE, SANS_DOMAINE]);
});

test("la zone ouvre une section, elle ne fait pas un répertoire", () => {
  // Sans portée, l'affirmation vaut partout.
  assert.deepEqual(zonesDeRangement({}), [TOUTES_ZONES]);
  assert.deepEqual(zonesDeRangement({ zones: ["Bâtiment A", "Bâtiment B"] }), ["Bâtiment A", "Bâtiment B"]);
  // Deux fois la même zone n'ouvre qu'une section.
  assert.deepEqual(zonesDeRangement({ zones: ["A", "A"] }), ["A"]);
});

test("les règles se lisent avant ce qu'on en tire, et ce qui vaut partout avant le reste", () => {
  assert.equal(rangDeLExtension(EXTENSION_REGLE), 0);
  assert.ok(rangDeLExtension("ref") < rangDeLExtension("ctr"));
  assert.ok(rangDeLExtension("ctr") < rangDeLExtension("hyp"));
  assert.equal(rangDeLaZone(TOUTES_ZONES), 0);
  assert.ok(rangDeLaZone(TOUTES_ZONES) < rangDeLaZone("Bâtiment A"));
});

test("les deux racines se lisent dans l'ordre : ce que le projet sait, puis ce qu'il a reçu", () => {
  assert.equal(rangDeLaRacine(MEMOIRE), 0);
  assert.ok(rangDeLaRacine(MEMOIRE) < rangDeLaRacine(DOCUMENTS));
  assert.match(phraseDeLaRacine(MEMOIRE), /jamais déplaçable/);
  assert.match(phraseDeLaRacine(DOCUMENTS), /Rangez-les comme vous voulez/);
});

test("chaque extension dit ce qu'elle contient, sans quoi on range au hasard", () => {
  assert.match(phraseDeLExtension("ref"), /règles appliquées/);
  assert.match(phraseDeLExtension("ctr"), /pas de recours/);
  assert.match(phraseDeLExtension("cst"), /Un constat sans date ne vaut rien/);
  assert.match(phraseDeLExtension("inconnue"), /ne devrait pas se remplir/);
});
