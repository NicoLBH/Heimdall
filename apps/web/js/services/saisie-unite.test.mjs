/**
 * Taper un nombre dans l'unité du projet, et pas dans une autre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { uniteImposee, frappeAvecUnite, valeurEssayee } from "./saisie-unite.js";

test("l'unité vient de la valeur de départ, quand elle en a une", () => {
  assert.equal(uniteImposee("0,466 m"), "m");
  assert.equal(uniteImposee("10,54 m3"), "m3");
  assert.equal(uniteImposee("1 200 m"), "m");
  // Toutes les valeurs du socle ne sont pas des mesures : coller « m » derrière
  // une catégorie serait absurde.
  assert.equal(uniteImposee("3e famille B"), "");
  assert.equal(uniteImposee("A2"), "");
  assert.equal(uniteImposee("CF 1/2 h"), "");
});

test("l'unité s'écrit à mesure qu'on tape le nombre", () => {
  // « je commence à taper 800 m : je tape 8 et il est écrit 8 m, je tape 0 et
  //   ça écrit 80 m, je retape 0 et ça écrit 800 m ».
  assert.deepEqual(frappeAvecUnite("8", "m"), { texte: "8 m", caret: 1 });
  assert.deepEqual(frappeAvecUnite("80", "m"), { texte: "80 m", caret: 2 });
  assert.deepEqual(frappeAvecUnite("800", "m"), { texte: "800 m", caret: 3 });
});

test("le curseur se pose devant l'unité, jamais derrière", () => {
  // Sinon la frappe suivante s'écrirait après le « m », et le champ se
  // remplirait à l'envers.
  const { texte, caret } = frappeAvecUnite("0,46", "m");
  assert.equal(texte, "0,46 m");
  assert.equal(texte.slice(0, caret), "0,46");
});

test("l'unité déjà écrite ne se redouble pas", () => {
  // Elle vient de nous : la relire comme une frappe donnerait « 8 m m ».
  assert.equal(frappeAvecUnite("8 m", "m").texte, "8 m");
  assert.equal(frappeAvecUnite("8m", "m").texte, "8 m");
  assert.equal(frappeAvecUnite("0,466 m", "m").texte, "0,466 m");
});

test("un champ vidé reste vide", () => {
  // Y laisser « m » tout seul empêcherait de l'effacer, et donnerait une unité
  // sans valeur — ce qui ne veut rien dire.
  assert.deepEqual(frappeAvecUnite("", "m"), { texte: "", caret: 0 });
  assert.deepEqual(frappeAvecUnite(" m", "m"), { texte: "", caret: 0 });
  assert.deepEqual(frappeAvecUnite("m", "m"), { texte: "", caret: 0 });
});

test("une unité tapée à la main ne passe pas", () => {
  // C'est exactement ce qu'on impose : « 80 cm » ne peut pas entrer là où le
  // projet écrit des mètres, parce que personne ne convertirait ensuite.
  assert.equal(frappeAvecUnite("80 cm", "m").texte, "80 m");
});

test("une valeur de départ sans unité laisse le champ libre", () => {
  assert.deepEqual(frappeAvecUnite("3e famille B", ""), { texte: "3e famille B", caret: 12 });
});

test("la valeur essayée s'écrit comme le projet l'écrit", () => {
  // Le défaut vu à l'écran : la mémoire portait « 0,466 m », on tapait « 8 », et
  // l'export gardait « 8 ». Le calcul lisait huit mètres — cette fois c'était le
  // bon sens, et rien ne le garantissait.
  assert.equal(valeurEssayee("8", "0,466 m"), "8 m");
  assert.equal(valeurEssayee("3e famille B", "2e famille"), "3e famille B");
});
