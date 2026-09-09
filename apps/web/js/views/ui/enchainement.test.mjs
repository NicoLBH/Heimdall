/**
 * L'enchaînement partagé : un seul dessin, deux sens de lecture.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderEnchainement, SENS } from "./enchainement.js";

const ETAPES = [
  { id: "a", label: "Première", detail: "ce qu'elle a fait", tone: "neutral", icon: "beaker",
    sorties: ["Altitude du site"] },
  { id: "b", label: "Seconde", detail: "", tone: "warn", icon: "alert",
    entrees: ["Altitude du site", "H0 retenu"], sorties: ["Profondeur hors gel"] }
];

test("les étapes se relient, une liaison de moins que de boîtes", () => {
  const html = renderEnchainement(ETAPES);
  assert.equal((html.match(/run-graph__node /g) ?? []).length, 2);
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 1);
});

test("une étape dit ce qu'elle lit et ce qu'elle écrit, et rien quand elle ne le dit pas", () => {
  const html = renderEnchainement(ETAPES);
  assert.match(html, /<i>lit<\/i>\s*<span>Altitude du site · H0 retenu<\/span>/);
  assert.match(html, /<i>écrit<\/i>\s*<span>Profondeur hors gel<\/span>/);
  // La première ne lit rien : pas de rubrique vide.
  assert.equal((html.match(/<i>lit<\/i>/g) ?? []).length, 1);
});

test("le même dessin tourne dans les deux sens", () => {
  assert.doesNotMatch(renderEnchainement(ETAPES), /run-graph__canvas--vertical/);
  assert.match(renderEnchainement(ETAPES, { sens: SENS.VERTICAL }), /run-graph__canvas--vertical/);
});

test("un titre n'est un bouton que si l'appelant nomme l'attribut qui l'écoute", () => {
  // Rendre cliquable un titre qui n'ouvre rien, ce serait promettre un détail
  // qu'on n'a pas.
  assert.doesNotMatch(renderEnchainement(ETAPES), /<button/);

  const avecLien = renderEnchainement(ETAPES, {
    attributDuLien: "data-run-step", consultables: new Set(["a"])
  });
  assert.match(avecLien, /<button[^>]*data-run-step="a"/);
  // La seconde n'a rien enregistré : elle reste un texte, et le dit au survol.
  assert.doesNotMatch(avecLien, /data-run-step="b"/);
  assert.match(avecLien, /title="Aucun détail n'a été enregistré/);
});

test("un enchaînement vide ne rend rien", () => {
  assert.equal(renderEnchainement([]), "");
  assert.equal(renderEnchainement(null), "");
});
