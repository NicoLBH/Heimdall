import test from "node:test";
import assert from "node:assert/strict";

import { choixDePortee, porteeRetenue } from "./choix-des-zones.js";

/** Une zone du découpage, telle que les Paramètres l'écrivent. */
const zone = (nom, definition) => ({
  id: `z-${nom}`, subject_key: nom, status: "assumed", superseded_by: null,
  payload: { subject: nom, value: definition, zoneDefinition: true }
});

test("« Toutes zones » vient en tête, et n'est pas une zone du découpage", () => {
  const choix = choixDePortee([zone("Bâtiment A", "Le corps principal"), zone("Bâtiment B", "L'annexe")]);

  assert.deepEqual(choix.map((entree) => entree.label), ["Toutes zones", "Bâtiment A", "Bâtiment B"]);
  // Sa clé est vide : cocher « partout » n'est pas cocher une zone de plus,
  // c'est ne rien restreindre.
  assert.equal(choix[0].key, "");
});

test("un projet sans découpage n'a rien à demander", () => {
  // Une seule entrée — « Toutes zones » — donc pas de question : tout y vaut
  // partout, et une fenêtre à une case serait une formalité sans objet.
  assert.equal(choixDePortee([]).length, 1);
});

test("une portée se dédoublonne et s'ordonne", () => {
  assert.deepEqual(porteeRetenue(["batiment-b", "batiment-a", "batiment-b"]), ["batiment-a", "batiment-b"]);
});

test("ne rien cocher vaut « partout », pas « nulle part »", () => {
  // Une liste vide est une portée — celle de l'ouvrage entier — et non une
  // absence de réponse. C'est ce que `zonesDeRangement` lit déjà comme
  // « Toutes zones ».
  assert.deepEqual(porteeRetenue([]), []);
  assert.deepEqual(porteeRetenue([""]), []);
});
