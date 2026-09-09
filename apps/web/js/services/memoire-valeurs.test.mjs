/**
 * Pour un nom et une portée, une seule valeur vaut.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { versementsEclipses, valeursCorrigees } from "./memoire-valeurs.js";
import { fichiersDeLaMemoire } from "./memoire-blame.js";

const verse = (id, { le, zones = [], valeur = "0,5 m", sujet = "H0 retenu pour le département" }) => ({
  id, project_id: "p1", subject_key: "h0-retenu-pour-le-departement",
  nature: "contrainte", domain: "structure", status: "assumed", superseded_by: null,
  created_at: le, decided_at: le,
  payload: { subject: sujet, value: valeur, zones }
});

test("deux fois la même zone : seul le dernier versement vaut", () => {
  // Le défaut signalé : « batiment-a: 0,5 m » deux fois de suite, toutes deux
  // « retenu ». À dix versements, le fichier devient une pile.
  const vieux = verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"] });
  const neuf = verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"] });

  assert.deepEqual([...versementsEclipses([vieux, neuf])], ["v1"]);
  // L'ordre dans lequel on les lit ne compte pas : c'est la date qui tranche.
  assert.deepEqual([...versementsEclipses([neuf, vieux])], ["v1"]);
});

test("deux portées différentes ne s'éclipsent pas", () => {
  // Corriger le bâtiment A ne dit rien du bâtiment B — et une valeur versée
  // « toutes zones » n'est pas la même affirmation qu'une valeur versée ici.
  const partout = verse("p1", { le: "2026-09-09T08:00:00Z", zones: [] });
  const batimentA = verse("a1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"] });
  const batimentB = verse("b1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-b"] });

  assert.deepEqual([...versementsEclipses([partout, batimentA, batimentB])], []);
});

test("le fichier ne montre plus la ligne éclipsée", () => {
  const fichiers = fichiersDeLaMemoire([
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"] }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"] })
  ]);

  const lignes = fichiers.flatMap((fichier) => fichier.lignes ?? []);
  assert.deepEqual(lignes.map((ligne) => ligne.id), ["v2"]);
});

test("un doublon se tait, une valeur qui change se dit", () => {
  // Rien à trancher quand les deux versements disent la même chose ; il y a
  // quelque chose à savoir quand ils disent autre chose.
  const pareil = [
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"] }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"] })
  ];
  assert.deepEqual(valeursCorrigees(pareil), []);

  const change = [
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"], valeur: "0,9 m" }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,5 m" })
  ];
  assert.deepEqual(valeursCorrigees(change), [
    { nom: "H0 retenu pour le département", avant: "0,9 m", apres: "0,5 m", zones: ["batiment-a"] }
  ]);
});

test("trois versements du même nom ne font qu'un avis", () => {
  // Répéter la correction pour chaque versement éclipsé ferait lire dix
  // désaccords là où le projet en a un.
  const corrections = valeursCorrigees([
    verse("v1", { le: "2026-09-05T08:00:00Z", zones: ["batiment-a"], valeur: "0,9 m" }),
    verse("v2", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"], valeur: "0,7 m" }),
    verse("v3", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,5 m" })
  ]);

  assert.equal(corrections.length, 1);
  assert.equal(corrections[0].apres, "0,5 m");
});

test("une règle ne s'éclipse pas : elle n'est pas une valeur", () => {
  const regle = (id, le) => ({
    ...verse(id, { le, zones: [] }),
    payload: { subject: "H0 retenu pour le département", referentiel: true }
  });

  assert.deepEqual([...versementsEclipses([regle("r1", "2026-09-07T08:00:00Z"), regle("r2", "2026-09-09T08:00:00Z")])], []);
});
