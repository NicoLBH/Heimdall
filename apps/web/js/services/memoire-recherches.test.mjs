import test from "node:test";
import assert from "node:assert/strict";

import {
  recherchesEpinglees, epingler, renommerLaRecherche, oublierLaRecherche
} from "./memoire-recherches.js";

/** Un `localStorage` de bureau : c'est là que ces réglages vivent. */
function coffre({ refuse = false } = {}) {
  const donnees = new Map();
  return {
    getItem: (cle) => (refuse ? (() => { throw new Error("refusé"); })() : donnees.get(cle) ?? null),
    setItem: (cle, valeur) => {
      if (refuse) throw new Error("refusé");
      donnees.set(cle, String(valeur));
    }
  };
}

test("une recherche épinglée se retrouve, par projet", () => {
  globalThis.window = { localStorage: coffre() };

  epingler("projet-1", "nature:hypothese zone:batiment-a");
  epingler("projet-2", "domaine:incendie");

  assert.deepEqual(recherchesEpinglees("projet-1").map((e) => e.requete),
    ["nature:hypothese zone:batiment-a"]);
  // Rangées par projet : elles ne suivent pas d'un chantier à l'autre.
  assert.deepEqual(recherchesEpinglees("projet-2").map((e) => e.requete), ["domaine:incendie"]);
  assert.deepEqual(recherchesEpinglees(""), []);
});

test("le titre proposé est la requête, et il se renomme", () => {
  globalThis.window = { localStorage: coffre() };

  // Demander un nom avant d'épingler ferait renoncer une fois sur deux : la
  // requête elle-même est ce qu'on reconnaît.
  const [posee] = epingler("p", "domaine:incendie");
  assert.equal(posee.titre, "domaine:incendie");

  renommerLaRecherche("p", posee.id, "Incendie, tout");
  assert.equal(recherchesEpinglees("p")[0].titre, "Incendie, tout");

  // Un titre vide se refuse : une entrée sans nom ne se retrouve pas.
  renommerLaRecherche("p", posee.id, "   ");
  assert.equal(recherchesEpinglees("p")[0].titre, "Incendie, tout");
});

test("une même requête ne s'épingle pas deux fois", () => {
  globalThis.window = { localStorage: coffre() };

  epingler("p", "domaine:incendie");
  epingler("p", "domaine:incendie");

  // Deux entrées qui font la même chose, et l'on ne saurait plus laquelle
  // effacer.
  assert.equal(recherchesEpinglees("p").length, 1);
  // Une requête vide n'est pas une recherche.
  epingler("p", "   ");
  assert.equal(recherchesEpinglees("p").length, 1);
});

test("on désépingle", () => {
  globalThis.window = { localStorage: coffre() };

  const [une] = epingler("p", "a:1");
  epingler("p", "b:2");
  oublierLaRecherche("p", une.id);

  assert.deepEqual(recherchesEpinglees("p").map((e) => e.requete), ["b:2"]);
});

test("un navigateur qui refuse le stockage ne casse pas l'écran", () => {
  // Fenêtre privée, réglage d'entreprise : on lit une liste vide, on écrit dans
  // le vide, et la recherche du jour fonctionne comme avant.
  globalThis.window = { localStorage: coffre({ refuse: true }) };

  assert.deepEqual(recherchesEpinglees("p"), []);
  assert.doesNotThrow(() => epingler("p", "a:1"));
  assert.deepEqual(recherchesEpinglees("p"), []);
});
