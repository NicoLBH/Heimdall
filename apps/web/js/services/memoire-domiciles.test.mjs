/**
 * Un nom vit à un seul endroit. Voir `docs/fondamentaux.md`, règle 10.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  domicilesDesNoms, rangementDuVersement, rangementVise, versementsHorsDomicile
} from "./memoire-domiciles.js";
import { fichiersDeLaMemoire } from "./memoire-blame.js";

/** L'utilitaire climat a versé la profondeur hors gel dans le sol, le premier. */
const CLIMAT = {
  id: "a1", created_at: "2026-01-10T09:00:00Z",
  subject_key: "profondeur-hors-gel", nature: "contrainte", domain: "geotechnique",
  payload: { subject: "Profondeur hors gel", value: "0,47 m" }
};

/** Celui des fondations a versé le même nom, plus tard, dans son domaine. */
const FONDATIONS = {
  id: "b2", created_at: "2026-02-14T09:00:00Z",
  subject_key: "profondeur-hors-gel", nature: "contrainte", domain: "structure",
  payload: { subject: "Profondeur hors gel", value: "0,50 m" }
};

test("le premier versement fixe le domicile d'un nom", () => {
  const domiciles = domicilesDesNoms([FONDATIONS, CLIMAT]);

  // L'ordre dans lequel on les lui donne ne compte pas : c'est la date qui
  // tranche. Sinon le même projet montrerait deux rangements selon la façon
  // dont la base a rendu ses lignes.
  assert.equal(domiciles.get("profondeur hors gel").fichier, rangementVise(CLIMAT).fichier);
  assert.equal(domicilesDesNoms([CLIMAT, FONDATIONS]).get("profondeur hors gel").fichier,
    domiciles.get("profondeur hors gel").fichier);
});

test("un versement ultérieur écrit au domicile, pas dans son propre domaine", () => {
  // C'est tout le temps 2 : le nom ne choisit plus son fichier à chaque
  // écriture, il en a un.
  assert.notEqual(rangementVise(FONDATIONS).fichier, rangementVise(CLIMAT).fichier);

  const domiciles = domicilesDesNoms([CLIMAT, FONDATIONS]);
  assert.equal(rangementDuVersement(FONDATIONS, domiciles).fichier, rangementVise(CLIMAT).fichier);
});

test("la mémoire ne dessine plus qu'un fichier pour ce nom", () => {
  const fichiers = fichiersDeLaMemoire([CLIMAT, FONDATIONS]);
  const portent = fichiers.filter((fichier) =>
    (fichier.lignes ?? []).some((ligne) => ligne.subject_key === "profondeur-hors-gel"));

  assert.equal(portent.length, 1, "un nom, un fichier");
  // Et une seule ligne : les deux versements ont la même portée, donc le plus
  // récent est ce que le projet tient pour vrai. Voir `memoire-valeurs.js`.
  assert.deepEqual(portent[0].lignes.map((ligne) => ligne.id), ["b2"]);
});

test("verser ailleurs se dit, une fois par nom", () => {
  // Temps 3 : ce qui est interdit n'est pas le désaccord, c'est le silence. Et
  // c'est le **nom** qui se tranche, pas chaque valeur : répéter le conflit
  // pour chaque versement ferait lire trente désaccords là où il y en a un.
  const encore = { ...FONDATIONS, id: "c3", created_at: "2026-03-01T09:00:00Z", payload: { ...FONDATIONS.payload, value: "0,52 m" } };
  const conflits = versementsHorsDomicile([CLIMAT, FONDATIONS, encore]);

  assert.equal(conflits.length, 1);
  assert.equal(conflits[0].nom, "Profondeur hors gel");
  assert.equal(conflits[0].vise, rangementVise(FONDATIONS).fichier);
  assert.equal(conflits[0].domicile, rangementVise(CLIMAT).fichier);
});

test("un nom versé toujours au même endroit n'ouvre aucun conflit", () => {
  assert.deepEqual(versementsHorsDomicile([CLIMAT, { ...CLIMAT, id: "a2", created_at: "2026-05-01T09:00:00Z" }]), []);
});

test("une règle ne fixe le domicile de personne, et garde le sien", () => {
  // Elle produit la valeur, elle ne la porte pas. Lui laisser fixer le domicile
  // enverrait toutes les valeurs du projet dans les `.ref` — dans le fichier
  // qui explique plutôt que dans celui qui garde.
  const regle = {
    id: "r1", created_at: "2026-01-01T09:00:00Z",
    subject_key: "profondeur-hors-gel", nature: "contrainte", domain: "incendie",
    payload: { subject: "Profondeur hors gel", referentiel: true }
  };

  const domiciles = domicilesDesNoms([regle, CLIMAT]);
  assert.equal(domiciles.get("profondeur hors gel").fichier, rangementVise(CLIMAT).fichier);
  assert.equal(rangementDuVersement(regle, domiciles).fichier, rangementVise(regle).fichier);
});

test("une affirmation remplacée ne déménage plus un nom", () => {
  // Sinon corriger l'ancienne valeur d'un nom le ferait changer de fichier, et
  // toutes les lignes qui la citent renverraient à côté.
  const ancienne = { ...CLIMAT, id: "z0", created_at: "2025-12-01T09:00:00Z", domain: "acoustique", superseded_by: "a1" };
  const domiciles = domicilesDesNoms([ancienne, CLIMAT]);

  assert.equal(domiciles.get("profondeur hors gel").fichier, rangementVise(CLIMAT).fichier);
});
