/**
 * Ce qu'un utilitaire déclare de son tableau — et ce qu'on refuse de deviner.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  SENS, COMPARAISON, colonnesDeclarees, colonneNommee, valeursDeclarees,
  sensDeLaValeur, uniteDeclaree, margeDeclaree, ecartALaMarge, pireEcart
} from "./tableau-structure.js";

const VERDICT = { nom: "vérification", valeurs: [
  { nom: "vérifiée", sens: SENS.TENU },
  { nom: "en défaut", sens: SENS.ROMPU },
  { nom: "non calculée", sens: SENS.INCONNU }
] };

const RATIO = { nom: "ratio déterminant", type: "nombre", marge: { limite: 1, comparaison: COMPARAISON.AU_PLUS } };

test("un mot n'est pas un sens : sans déclaration, on ne dit rien", () => {
  // C'est tout le dispositif. Lire « en défaut » et en déduire une couleur
  // serait une machine à deviner le français, qui se tromperait un jour sans le
  // dire — et qu'il faudrait enrichir à chaque utilitaire ajouté.
  assert.equal(sensDeLaValeur({ valeurs: ["vérifiée", "en défaut"] }, "en défaut"), "");
  assert.equal(sensDeLaValeur({ nom: "hauteur", type: "nombre, en m" }, "1,00 m"), "");
  assert.equal(sensDeLaValeur(null, "en défaut"), "");
  // Une valeur hors de l'énumération n'invente rien non plus.
  assert.equal(sensDeLaValeur(VERDICT, "catastrophique"), "");
});

test("un sens déclaré se lit, et lui seul", () => {
  assert.equal(sensDeLaValeur(VERDICT, "en défaut"), SENS.ROMPU);
  assert.equal(sensDeLaValeur(VERDICT, "vérifiée"), SENS.TENU);
  assert.equal(sensDeLaValeur(VERDICT, "non calculée"), SENS.INCONNU);
  // Un sens hors du vocabulaire fermé ne passe pas : il ouvrirait un
  // dictionnaire, et chacun écrirait le sien.
  assert.equal(sensDeLaValeur({ valeurs: [{ nom: "x", sens: "catastrophique" }] }, "x"), "");
});

test("les deux écritures de « valeurs » se lisent", () => {
  // La forme nue est celle d'avant : une migration se fait par ajout.
  assert.deepEqual(valeursDeclarees({ valeurs: ["Meyerhoff", "Constante"] }), [
    { nom: "Meyerhoff", sens: "" }, { nom: "Constante", sens: "" }
  ]);
  assert.deepEqual(valeursDeclarees(VERDICT).map((v) => v.sens), [SENS.TENU, SENS.ROMPU, SENS.INCONNU]);
  assert.deepEqual(valeursDeclarees(null), []);
});

test("les groupes ne cachent pas les colonnes qu'ils contiennent", () => {
  const structure = [
    { nom: "désignation", type: "texte" },
    { nom: "sol et matériaux", champs: [
      { nom: "contrainte limite à l'ELS", type: "nombre" },
      { nom: "angle de frottement", type: "nombre, en degrés" }
    ] }
  ];

  assert.deepEqual(colonnesDeclarees(structure).map((c) => c.nom), [
    "désignation", "contrainte limite à l'ELS", "angle de frottement"
  ]);
  assert.equal(colonneNommee(structure, "angle de frottement").groupe, "sol et matériaux");
  assert.equal(colonneNommee(structure, "inconnue"), null);
});

test("l'unité vient de la déclaration, explicite ou écrite dans le type", () => {
  assert.equal(uniteDeclaree({ type: "nombre, en m" }), "m");
  assert.equal(uniteDeclaree({ type: "nombre, en m3" }), "m3");
  assert.equal(uniteDeclaree({ type: "nombre, en degrés" }), "degrés");
  assert.equal(uniteDeclaree({ type: "nombre" }), "");
  assert.equal(uniteDeclaree({ type: "nombre, en m", unite: "cm" }), "cm", "l'explicite l'emporte");
});

test("sans limite déclarée, un nombre reste un nombre sans échelle", () => {
  assert.equal(margeDeclaree({ nom: "ratio déterminant", type: "nombre" }), null);
  assert.equal(ecartALaMarge({ nom: "ratio déterminant", type: "nombre" }, "16,050"), null);
  // Une valeur illisible ne vaut pas zéro : une marge à zéro se lit comme une
  // marge, et se croit.
  assert.equal(ecartALaMarge(RATIO, "sans objet"), null);
});

test("l'écart à la limite se dit, et de quel côté", () => {
  assert.deepEqual(ecartALaMarge(RATIO, "16,050"), { fois: 16.05, depasse: true, limite: 1 });
  assert.equal(ecartALaMarge(RATIO, "0,925").depasse, false);

  const couverture = { nom: "taux de couverture", type: "nombre", marge: { limite: 1, comparaison: COMPARAISON.AU_MOINS } };
  assert.equal(ecartALaMarge(couverture, "0,80").depasse, true, "sous une limite basse, être en dessous est le défaut");
});

test("la pire valeur est celle qui décide, et elle dépend du sens de la limite", () => {
  assert.equal(pireEcart(RATIO, ["0,667", "16,050", "8,191"]).valeur, "16,050");

  const couverture = { nom: "couverture", type: "nombre", marge: { limite: 1, comparaison: COMPARAISON.AU_MOINS } };
  assert.equal(pireEcart(couverture, ["1,20", "0,80", "1,00"]).valeur, "0,80");

  assert.equal(pireEcart({ nom: "hauteur", type: "nombre" }, ["1", "2"]), null);
  assert.equal(pireEcart(RATIO, ["sans objet"]), null);
});
