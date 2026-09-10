/**
 * Où le projet se trouve **aujourd'hui**.
 *
 * Ce qui se teste ici est ce qui faisait perdre confiance sans jamais tomber en
 * panne : une adresse corrigée, une proposition signée, et l'Atelier qui
 * affichait encore l'ancienne.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { localisationDeLaMemoire } from "./localisation-du-projet.js";
import { SUJET_LOCALISATION, SUJET_ALTITUDE } from "../utilitaires/agents-climatiques.js";

const verse = (sujet, payload, { le = "2026-01-02T10:00:00Z", remplacee = null } = {}) => ({
  id: `${sujet}-${le}`, decided_at: le, superseded_by: remplacee,
  payload: { subject: sujet, ...payload }
});

const LIGNE = {
  commune: "Montholon", codeInsee: "89003", codePostal: "89110",
  adresse: "", latitude: "47.800000", longitude: "3.500000"
};

test("la localisation vient de la mémoire, avec son point et son altitude", () => {
  const rendu = localisationDeLaMemoire([
    verse(SUJET_LOCALISATION, { tableau: [LIGNE] }),
    verse(SUJET_ALTITUDE, { value: "97,91 m" })
  ]);

  assert.equal(rendu.city, "Montholon");
  assert.equal(rendu.codeInsee, "89003");
  assert.equal(rendu.latitude, 47.8);
  assert.equal(rendu.longitude, 3.5);
  // « 97,91 m » se relit en nombre : le calcul climatique attend un nombre.
  assert.equal(rendu.altitude, 97.91);
});

test("c'est la plus récemment décidée qui vaut", () => {
  // Une mémoire peut porter deux versements du même sujet le temps qu'un
  // remplacement se propage. Prendre le premier venu rendrait l'adresse d'avant
  // une fois sur deux.
  const rendu = localisationDeLaMemoire([
    verse(SUJET_LOCALISATION, { tableau: [{ ...LIGNE, commune: "Avant", codeInsee: "00000" }] }, { le: "2026-01-01T10:00:00Z" }),
    verse(SUJET_LOCALISATION, { tableau: [LIGNE] }, { le: "2026-03-04T10:00:00Z" })
  ]);
  assert.equal(rendu.city, "Montholon");
});

test("une ligne remplacée ne compte pas", () => {
  const rendu = localisationDeLaMemoire([
    verse(SUJET_LOCALISATION, { tableau: [{ ...LIGNE, commune: "Remplacée" }] }, { le: "2026-05-01T10:00:00Z", remplacee: "x" }),
    verse(SUJET_LOCALISATION, { tableau: [LIGNE] })
  ]);
  assert.equal(rendu.city, "Montholon");
});

test("un projet sans localisation en mémoire rend `null`, pas un endroit vide", () => {
  // Un objet aux champs vides se dessinerait comme une localisation qu'on aurait
  // perdue. `null` dit qu'il n'y en a pas.
  assert.equal(localisationDeLaMemoire([verse(SUJET_ALTITUDE, { value: "12 m" })]), null);
  assert.equal(localisationDeLaMemoire([]), null);
  assert.equal(localisationDeLaMemoire(null), null);
});

test("une altitude absente reste absente : `null`, jamais zéro", () => {
  const rendu = localisationDeLaMemoire([verse(SUJET_LOCALISATION, { tableau: [LIGNE] })]);
  assert.equal(rendu.altitude, null);
});

test("un point absent reste absent", () => {
  const rendu = localisationDeLaMemoire([
    verse(SUJET_LOCALISATION, { tableau: [{ commune: "Montholon", codeInsee: "89003" }] })
  ]);
  assert.equal(rendu.latitude, null);
  assert.equal(rendu.longitude, null);
  assert.equal(rendu.city, "Montholon");
});
