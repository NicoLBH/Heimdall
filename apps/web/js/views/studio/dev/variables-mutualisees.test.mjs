import test from "node:test";
import assert from "node:assert/strict";

import { variablesFiltrees, renderTableauDesVariables } from "./variables-mutualisees.js";

const variable = (nom, extra = {}) => ({
  cle: nom.toLowerCase(), nom, valeur: "", declaree: true,
  declarePar: "memoire/donnees-de-base.ddb", citeePar: [], ...extra
});

test("la recherche porte sur le nom, parce que c'est lui qu'on cherche", () => {
  const toutes = [
    variable("Hauteur du plancher bas"),
    variable("Hauteur du dernier plancher"),
    variable("Classement du bâtiment")
  ];

  // On vient ici parce qu'on ne se rappelle plus comment un nom s'écrit : la
  // recherche doit rapprocher les voisins, pas les départager.
  assert.deepEqual(
    variablesFiltrees(toutes, "hauteur").map((v) => v.nom),
    ["Hauteur du plancher bas", "Hauteur du dernier plancher"]
  );
  assert.equal(variablesFiltrees(toutes, "").length, 3);
});

test("ce que personne n'a versé se compte à part", () => {
  const rendu = renderTableauDesVariables([
    variable("Hauteur du plancher bas", { valeur: "26 m", citeePar: ["memoire/incendie.ref"] }),
    variable("Logements superposés", { declaree: false, declarePar: "", citeePar: ["memoire/incendie.ref"] })
  ]);

  assert.match(rendu, /1 sans déclaration/);
  assert.match(rendu, /memoire-variable--inconnue/);
  assert.match(rendu, /personne ne l'a versée/);
});

test("un projet sans variable le dit, plutôt que de montrer un tableau vide", () => {
  assert.match(renderTableauDesVariables([]), /Aucune variable/);
});

test("une recherche sans réponse se dit aussi", () => {
  // Un tableau qui disparaît laisse croire que la mémoire s'est vidée.
  const rendu = renderTableauDesVariables([variable("Hauteur du plancher bas")], "zzz");
  assert.match(rendu, /Aucun nom ne contient/);
});
