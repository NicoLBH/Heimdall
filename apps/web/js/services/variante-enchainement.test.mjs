/**
 * La chaîne d'une variante : ce qui découle de quoi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { enchainementDeLaVariante, TON } from "./variante-enchainement.js";

const DEPART = { sujet: "Altitude du site", valeur: "13,22 m", essaye: "800 m" };

const rendu = (dessus = {}) => ({
  ok: true, recalculees: [], rejouees: [], aRevoir: [], relectures: { recalculees: [], refusees: [] }, ...dessus
});

const recalculee = (sujet, utilitaire, bouge = true) => ({
  sujet, utilitaire, valeurABouge: bouge, reservesOntBouge: false, assertion: { id: `a-${sujet}` }
});

test("la chaîne part de ce qu'on essaie et suit l'ordre du rejeu", () => {
  // C'est tout l'objet : altitude → hors gel → fondations. En liste, rien ne
  // disait que la troisième découlait de la deuxième — et c'est ce qui a fait
  // qu'un enchaînement correct a été lu comme s'il ne s'était rien passé.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [
      recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1"),
      recalculee("Zone de neige", "deduction_zone_neige_commune_V1", false),
      recalculee("Résultat du calcul des fondations superficielles",
        "dimensionnement_fondations_superficielles_V1")
    ]
  }), DEPART);

  assert.deepEqual(etapes.map((etape) => etape.id), [
    "depart",
    "recalculee:a-Profondeur hors gel",
    "recalculee:a-Zone de neige",
    "recalculee:a-Résultat du calcul des fondations superficielles"
  ]);
  assert.deepEqual(etapes[0].sorties, ["Altitude du site"]);
  assert.equal(etapes[0].detail, "13,22 m → 800 m");
});

test("une étape dit ce qu'elle lit, d'après ce que l'utilitaire a déclaré", () => {
  // Les entrées ne se devinent pas de la chaîne : elles viennent du `lit` de
  // l'utilitaire, et un utilitaire qui déclare mal se voit ici.
  const [, horsGel] = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")]
  }), DEPART);

  assert.deepEqual(horsGel.entrees, ["H0 retenu pour le département", "Altitude du site"]);
  assert.deepEqual(horsGel.sorties, ["Profondeur hors gel"]);
  assert.equal(horsGel.detail, "a recalculé");
});

test("une valeur relue sans changement le dit, et ne se déguise pas en recalcul", () => {
  const [, neige] = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Zone de neige", "deduction_zone_neige_commune_V1", false)]
  }), DEPART);

  assert.equal(neige.detail, "a relu, sans changement");
  assert.equal(neige.icon, "check");
});

test("ce qui reste en suspens et ce qui a refusé ferment la chaîne, avec leur ton", () => {
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")],
    rejouees: [{ sujet: "Fondations profondes" }, { sujet: "Degré CF" }],
    aRevoir: [{ sujet: "Ancrage des semelles" }],
    relectures: { recalculees: [], refusees: [{ sujet: "Zone de vent" }] }
  }), DEPART);

  const par = (id) => etapes.find((etape) => etape.id === id);
  assert.deepEqual(par("rejouees").sorties, ["Fondations profondes", "Degré CF"]);
  assert.equal(par("rejouees").label, "2 règles du projet rejouées");
  assert.equal(par("a-revoir").tone, TON.DOUTE);
  assert.equal(par("refusees").tone, TON.ROMPU);
  // Les noms, jamais un compte seul : « 1 à revérifier » sans dire laquelle
  // laisserait la chercher dans le tableau.
  assert.deepEqual(par("a-revoir").entrees, ["Ancrage des semelles"]);
});

test("une variante qui n'enchaîne rien ne dessine pas de chaîne", () => {
  // « Ce que vous essayez », seul, ne montre aucun enchaînement et occuperait
  // une colonne pour rien.
  assert.deepEqual(enchainementDeLaVariante(rendu(), DEPART), []);
  assert.deepEqual(enchainementDeLaVariante({ ok: false }, DEPART), []);
  assert.deepEqual(enchainementDeLaVariante(null, DEPART), []);
});
