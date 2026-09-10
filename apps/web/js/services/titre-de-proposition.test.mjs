/**
 * Ce qu'on met sous les yeux du modèle pour qu'il nomme une proposition.
 *
 * L'appel lui-même n'est pas rejoué ici — il traverse le réseau. Ce qui se teste
 * est ce qui décide de la phrase : quelles lignes partent, lesquelles restent,
 * et quand on ne paie pas du tout.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { faitsDuDiff, meriteUneRedaction, MAX_LIGNES } from "./titre-de-proposition.js";
import { CHANGEMENT } from "./proposition-avant-apres.js";

const ligne = (sujet, dessus = {}) => ({
  sujet, domaineLabel: "Structure", avant: "0,60 m", apres: "0,66 m",
  zones: ["Bâtiment A"], changement: CHANGEMENT.CORRECTION, ...dessus
});

const tableau = (lignes, dessus = {}) => ({
  lignes,
  compte: { nouveau: 0, correction: lignes.length, retrait: 0, identique: 0 },
  memoireLue: true,
  ...dessus
});

test("une ligne n'emporte que ce qui sert à la phrase", () => {
  // Ni la mémoire entière, ni les documents, ni la conversation avec le
  // copilote — celle-là ne sort jamais. Ce qui n'est pas nécessaire ne part pas.
  const { lignes } = faitsDuDiff(tableau([
    ligne("Profondeur hors gel", { rangement: { fichier: "x.ctr" }, deduitDe: { nom: "secret" } })
  ]));

  assert.deepEqual(lignes, [{
    sujet: "Profondeur hors gel", domaine: "Structure",
    avant: "0,60 m", apres: "0,66 m", zones: ["Bâtiment A"], changement: CHANGEMENT.CORRECTION
  }]);
});

test("les lignes identiques ne partent pas, mais leur nombre part", () => {
  // Une ligne inchangée ne dit rien de ce qui change, et la citer dans un titre
  // serait une fausse piste. Le compte, lui, dit quelque chose du lot.
  const faits = faitsDuDiff({
    lignes: [ligne("Zone de neige"), ligne("Zone de vent", { changement: CHANGEMENT.IDENTIQUE })],
    compte: { nouveau: 0, correction: 1, retrait: 0, identique: 1 },
    memoireLue: true
  });

  assert.deepEqual(faits.lignes.map((l) => l.sujet), ["Zone de neige"]);
  assert.equal(faits.compte.identique, 1);
});

test("un diff trop long s'arrête, et compte ce qu'il n'a pas montré", () => {
  // Le taire ferait nommer un lot en croyant l'avoir vu en entier. Règle 5.
  const faits = faitsDuDiff(tableau(
    Array.from({ length: MAX_LIGNES + 7 }, (_, rang) => ligne(`Sujet ${rang}`))
  ));

  assert.equal(faits.lignes.length, MAX_LIGNES);
  assert.equal(faits.omises, 7);
});

test("une mémoire illisible se dit, elle ne se devine pas", () => {
  // Sans « avant », le modèle écrirait « ajoute » là où le projet corrige.
  assert.equal(faitsDuDiff(tableau([ligne("Zone de neige")], { memoireLue: false })).memoireLue, false);
  assert.equal(faitsDuDiff(null).memoireLue, false);
});

test("un tableau absent rend des faits vides, pas une panne", () => {
  const faits = faitsDuDiff(null);
  assert.deepEqual(faits.lignes, []);
  assert.equal(faits.omises, 0);
  assert.deepEqual(faits.compte, { nouveau: 0, correction: 0, retrait: 0, identique: 0 });
});

/* ── Quand on ne paie pas ────────────────────────────────────────────────── */

test("une seule ligne se nomme d'elle-même : pas d'appel", () => {
  // « Zone de neige : A1 → A2 » est déjà le meilleur titre possible ; un modèle
  // ne ferait que le rallonger.
  assert.equal(meriteUneRedaction(faitsDuDiff(tableau([ligne("Zone de neige")]))), false);
  assert.equal(meriteUneRedaction(faitsDuDiff(tableau([]))), false);
});

test("deux lignes et une mémoire lue méritent une phrase", () => {
  assert.equal(
    meriteUneRedaction(faitsDuDiff(tableau([ligne("Zone de neige"), ligne("Zone de vent")]))),
    true
  );
});

test("sans mémoire lue, on ne paie pas une phrase écrite sur la moitié du diff", () => {
  const faits = faitsDuDiff(tableau([ligne("Zone de neige"), ligne("Zone de vent")], { memoireLue: false }));
  assert.equal(meriteUneRedaction(faits), false);
});

test("des faits absents ne méritent rien", () => {
  assert.equal(meriteUneRedaction(null), false);
  assert.equal(meriteUneRedaction({}), false);
});
