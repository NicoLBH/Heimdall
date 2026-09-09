/**
 * Ce qui n'est plus le présent, sans avoir été effacé. Règle 11, troisième cas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { horsPerimetre, zonesRetirees, lignesRepriseesParUneVersion, HORS_PERIMETRE } from "./memoire-perimetre.js";
import { fichiersDeLaMemoire } from "./memoire-blame.js";

const zone = (id, label, { retiree = false } = {}) => ({
  id, project_id: "p1", subject_key: `zone-${id}`, nature: "intendance", domain: "",
  status: retiree ? "rejected" : "assumed", superseded_by: null,
  created_at: "2026-09-01T09:00:00Z", decided_at: "2026-09-01T09:00:00Z",
  payload: { subject: label, zoneDefinition: true, value: "une partie de l'ouvrage" }
});

const produite = (id, sujet, { zones = [], utilitaire = "", le = "2026-09-01T09:00:00Z" } = {}) => ({
  id, project_id: "p1", subject_key: id, nature: "contrainte", domain: "structure",
  status: "assumed", superseded_by: null, created_at: le, decided_at: le, zones,
  payload: { subject: sujet, value: "1,00 m", zones, utilitaire }
});

test("une zone définie puis retirée emporte ce qui ne valait que pour elle", () => {
  // Le cas de l'essai : on crée « zone d'essai », on y calcule, puis on retire
  // la zone. Les valeurs restaient, portées par une zone qui n'existe plus.
  const memoire = [
    zone("z1", "Zone d'essai", { retiree: true }),
    produite("s1", "Section Lx", { zones: ["zone-d-essai"] }),
    produite("s2", "Altitude du site", { zones: [] })
  ];

  assert.deepEqual([...zonesRetirees(memoire).keys()], ["zone-d-essai"]);

  const sorties = horsPerimetre(memoire);
  assert.equal(sorties.get("s1").motif, HORS_PERIMETRE.ZONE_RETIREE);
  assert.match(sorties.get("s1").dit, /retirée avec « Zone d'essai »/);
  // Ce qui vaut partout ne quitte pas le projet parce qu'une zone s'en va.
  assert.equal(sorties.has("s2"), false);
});

test("une zone jamais définie n'est pas une zone retirée", () => {
  // Personne ne l'a retirée, personne ne l'a décrite non plus. Escamoter la
  // ligne cacherait le vrai défaut : il manque une définition.
  const memoire = [produite("s1", "Section Lx", { zones: ["batiment-a"] })];

  assert.equal(zonesRetirees(memoire).size, 0);
  assert.equal(horsPerimetre(memoire).size, 0);
});

test("une ligne qui vaut encore pour une autre zone reste", () => {
  const memoire = [
    zone("z1", "Zone d'essai", { retiree: true }),
    produite("s1", "Section Lx", { zones: ["zone-d-essai", "batiment-a"] })
  ];

  assert.equal(horsPerimetre(memoire).size, 0);
});

test("ce qu'une version plus récente n'a pas repris quitte le présent", () => {
  // La V1 versait quatre-vingts cotes une par une ; la V2 range tout dans un
  // tableau. Les cotes de la V1 ne sont plus produites par personne.
  const memoire = [
    produite("lx", "Section Lx de la semelle A", { zones: ["batiment-a"], utilitaire: "fondations_V1" }),
    produite("ly", "Section Ly de la semelle A", { zones: ["batiment-a"], utilitaire: "fondations_V1" }),
    produite("res", "Résultat du calcul", { zones: ["batiment-a"], utilitaire: "fondations_V2", le: "2026-09-09T09:00:00Z" })
  ];

  const reprises = lignesRepriseesParUneVersion(memoire);
  assert.deepEqual([...reprises.keys()].sort(), ["lx", "ly"]);

  const sorties = horsPerimetre(memoire);
  assert.equal(sorties.get("lx").motif, HORS_PERIMETRE.VERSION_REPRISE);
  assert.match(sorties.get("lx").dit, /fondations V1 a été repris par la V2/);
  assert.equal(sorties.has("res"), false);
});

test("ce que la nouvelle version reverse sous le même nom n'est pas un résidu", () => {
  // Elle a refait ce travail-là : la ligne de la V1 est remplacée, pas
  // abandonnée, et c'est `memoire-valeurs.js` qui s'en occupe.
  const memoire = [
    produite("v1", "Hauteur de la semelle", { zones: ["batiment-a"], utilitaire: "fondations_V1" }),
    produite("v2", "Hauteur de la semelle", { zones: ["batiment-a"], utilitaire: "fondations_V2", le: "2026-09-09T09:00:00Z" })
  ];

  assert.equal(lignesRepriseesParUneVersion(memoire).size, 0);
});

test("la V2 rejouée sur un bâtiment ne dit rien de l'autre", () => {
  const memoire = [
    produite("a", "Section Lx", { zones: ["batiment-a"], utilitaire: "fondations_V1" }),
    produite("b", "Section Lx", { zones: ["batiment-b"], utilitaire: "fondations_V1" }),
    produite("res", "Résultat du calcul", { zones: ["batiment-a"], utilitaire: "fondations_V2", le: "2026-09-09T09:00:00Z" })
  ];

  const sorties = horsPerimetre(memoire);
  assert.equal(sorties.has("a"), true, "le bâtiment A a été refait");
  assert.equal(sorties.has("b"), false, "le bâtiment B n'a rien vu passer");
});

test("le fichier ne montre plus ce qui a quitté le présent", () => {
  const memoire = [
    zone("z1", "Zone d'essai", { retiree: true }),
    produite("s1", "Section Lx", { zones: ["zone-d-essai"] }),
    produite("s2", "Altitude du site", { zones: ["batiment-a"] })
  ];

  const fichiers = fichiersDeLaMemoire(memoire);
  const vivantes = fichiers.flatMap((fichier) => fichier.lignes ?? []).map((ligne) => ligne.id);
  assert.equal(vivantes.includes("s1"), false);
  assert.equal(vivantes.includes("s2"), true);

  // Et elle n'est pas perdue : le fichier la porte, à part, avec son motif.
  const sorties = fichiers.flatMap((fichier) => fichier.horsPerimetre ?? []);
  assert.deepEqual(sorties.map((sortie) => sortie.assertion.id), ["s1"]);
  assert.match(sorties[0].dit, /Zone d'essai/);
});
