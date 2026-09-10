import test from "node:test";
import assert from "node:assert/strict";

import { ECRAN, definitionVersable, renommageVersable, retraitVersable } from "./zones-versement.js";
import { cleDAffirmation, itemsDeProposition } from "./atelier-proposition.js";
import { definedZones } from "./project-zones.js";

/* ── Ce qu'une définition porte ──────────────────────────────────────────── */

test("une zone se définit avec un nom, et sa clé vient du nom", () => {
  const ligne = definitionVersable({ label: "Bâtiment A / Rdc", definition: "ERP type M, 5ᵉ catégorie" });

  assert.equal(ligne.sujet, "Bâtiment A / Rdc");
  assert.equal(ligne.valeur, "ERP type M, 5ᵉ catégorie");
  assert.equal(ligne.zoneDefinition, true);
  assert.equal(ligne.zoneKey, "batiment-a-rdc");
  assert.equal(ligne.atelier, ECRAN);
  // Une définition ne porte pas la zone qu'elle décrit : elle disparaîtrait de
  // toute lecture autre que la sienne, y compris de celle où on la cherche.
  assert.deepEqual(ligne.zones, []);
});

test("une zone sans nom lisible ne se propose pas", () => {
  assert.equal(definitionVersable({ label: "   " }), null);
  assert.equal(definitionVersable({ label: "…" }), null);
});

test("une zone sans définition vaut quand même : son nom suffit", () => {
  // Une proposition dont la valeur serait vide n'entrerait pas — et une zone
  // nommée sans être décrite est un découpage en cours, pas une erreur.
  assert.equal(definitionVersable({ label: "Bâtiment C" }).valeur, "Bâtiment C");
});

/* ── Le retrait ──────────────────────────────────────────────────────────── */

test("un retrait est une définition de plus, marquée, qui garde le nom", () => {
  // « Bâtiment C » sans son nom ne se relirait pas, et les affirmations qui la
  // portent encore deviendraient incompréhensibles.
  const ligne = retraitVersable({ label: "Bâtiment C", motif: "le lot a été abandonné" });

  assert.equal(ligne.sujet, "Bâtiment C");
  assert.equal(ligne.retiree, true);
  assert.equal(ligne.zoneDefinition, true);
  assert.match(ligne.valeur, /Retirée du projet — le lot a été abandonné/);
});

test("un retrait sans motif se dit quand même, sans en inventer un", () => {
  assert.equal(retraitVersable({ label: "Bâtiment C" }).valeur, "Retirée du projet");
});

test("une zone retirée quitte les listes et reste dans l'histoire", () => {
  const memoire = [
    {
      id: "z1", kind: "base-datum", status: "assumed", superseded_by: "z2",
      payload: { subject: "Bâtiment C", value: "Halle", zoneDefinition: true, zoneKey: "batiment-c" }
    },
    {
      id: "z2", kind: "base-datum", status: "assumed", superseded_by: null,
      payload: {
        subject: "Bâtiment C", value: "Retirée du projet", zoneDefinition: true,
        zoneKey: "batiment-c", retiree: true
      }
    }
  ];

  assert.deepEqual(definedZones(memoire), []);
});

/* ── Renommer, c'est définir et retirer ──────────────────────────────────── */

test("renommer une zone en définit une autre et retire la première", () => {
  // La clé vient du nom : sans le retrait, les deux vaudraient à la fois et le
  // projet aurait un bâtiment de trop.
  const lignes = renommageVersable({ ancien: "Bâtiment C", label: "Bâtiment Nord", definition: "Halle" });

  assert.deepEqual(lignes.map((ligne) => [ligne.sujet, ligne.retiree === true]), [
    ["Bâtiment Nord", false],
    ["Bâtiment C", true]
  ]);
  assert.match(lignes[1].valeur, /renommée en « Bâtiment Nord »/);
});

test("préciser une zone sans la renommer ne retire rien", () => {
  const lignes = renommageVersable({ ancien: "Bâtiment C", label: "Bâtiment C", definition: "Halle métallique" });

  assert.deepEqual(lignes.map((ligne) => ligne.sujet), ["Bâtiment C"]);
});

/* ── La clé qui périme la définition précédente ──────────────────────────── */

test("une définition de zone porte la clé du projet, et périme la précédente", () => {
  // Sans elle, redéfinir ou retirer une zone laisserait les deux valoir, et le
  // projet aurait deux découpages.
  const definition = definitionVersable({ label: "Bâtiment A / Rdc", definition: "ERP" });
  const retrait = retraitVersable({ label: "Bâtiment A / Rdc" });

  assert.equal(cleDAffirmation(definition), "zone:batiment-a-rdc");
  assert.equal(cleDAffirmation(retrait), cleDAffirmation(definition));
});

test("la proposition emporte ce qui fait une zone", () => {
  const [item] = itemsDeProposition([retraitVersable({ label: "Bâtiment C", motif: "abandonné" })]);

  assert.equal(item.itemKey, "zone:batiment-c");
  assert.equal(item.payload.zoneDefinition, true);
  assert.equal(item.payload.zoneKey, "batiment-c");
  assert.equal(item.payload.retiree, true);
});

test("une donnée de base ordinaire ne prend pas la clé d'une zone", () => {
  const [item] = itemsDeProposition([{ sujet: "Bâtiment C", valeur: "Halle" }]);

  assert.notEqual(item.itemKey, "zone:batiment-c");
  assert.equal(item.payload.zoneDefinition, null);
});
