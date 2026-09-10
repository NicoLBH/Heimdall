/**
 * Pointer un projet sur une vue satellite, sans bibliothèque de cartes.
 *
 * Ce qui se teste ici est ce qui rendrait la carte inutilisable sans qu'on
 * sache pourquoi : un pixel qui ne vaut pas la même chose selon la latitude, et
 * un glissement qui part du mauvais côté.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ZOOM_MIN, ZOOM_MAX, ZOOM_COMMUNE,
  zoomBorne, metresParPixel, pointADistance, centreApresGlissement, pixelsDepuisLeCentre
} from "./carte-pointee.js";
import { distanceEnMetres } from "./localisation-mouvement.js";

/** Aucun projet réel : une commune de montagne, prise pour ses dénivelés. */
const ICI = { latitude: 44.896452, longitude: 6.635087 };

/* ── Ce qu'un pixel vaut ─────────────────────────────────────────────────── */

test("un pixel couvre moins de terrain quand on zoome, et moins près des pôles", () => {
  const z14 = metresParPixel(ICI.latitude, 14);
  const z18 = metresParPixel(ICI.latitude, 18);
  assert.ok(Math.abs(z14 / z18 - 16) < 0.001, "quatre crans de zoom, seize fois moins de terrain");

  assert.ok(metresParPixel(0, 18) > metresParPixel(60, 18), "un pixel rétrécit vers le nord");
});

test("un zoom hors des bornes se ramène dans ce qu'on sait afficher", () => {
  assert.equal(zoomBorne(2), ZOOM_MIN);
  assert.equal(zoomBorne(30), ZOOM_MAX);
  assert.equal(zoomBorne(17.4), 17);
  // `null` n'est pas zéro : sans zoom demandé, on rend celui d'arrivée.
  assert.equal(zoomBorne(null), ZOOM_COMMUNE);
  assert.equal(zoomBorne("pas un nombre"), ZOOM_COMMUNE);
});

/* ── Un point à tant de pixels du centre ─────────────────────────────────── */

test("cent pixels vers l'est font la distance qu'ils doivent faire", () => {
  const point = pointADistance(ICI, { dx: 100, dy: 0, zoom: 18 });
  const attendu = 100 * metresParPixel(ICI.latitude, 18);
  assert.ok(Math.abs(distanceEnMetres(ICI, point) - attendu) < 0.5);
  assert.ok(point.longitude > ICI.longitude, "vers la droite de l'écran, c'est vers l'est");
});

test("vers le bas de l'écran, c'est vers le sud", () => {
  // Une carte dont le nord descend quand on tire vers le bas se lit comme
  // cassée, et l'on n'ose plus y toucher.
  const point = pointADistance(ICI, { dx: 0, dy: 120, zoom: 18 });
  assert.ok(point.latitude < ICI.latitude);
});

test("aller puis revenir ramène au même endroit", () => {
  const point = pointADistance(ICI, { dx: 240, dy: -80, zoom: 17 });
  const retour = pixelsDepuisLeCentre(ICI, point, { zoom: 17 });
  assert.ok(Math.abs(retour.dx - 240) < 0.01);
  assert.ok(Math.abs(retour.dy + 80) < 0.01);
});

test("un point hors du cadre ne se dessine pas", () => {
  // Le coller au bord ferait croire que le projet est là.
  const loin = pointADistance(ICI, { dx: 900, dy: 0, zoom: 18 });
  assert.equal(pixelsDepuisLeCentre(ICI, loin, { zoom: 18, largeur: 600, hauteur: 400 }), null);
  assert.ok(pixelsDepuisLeCentre(ICI, loin, { zoom: 18, largeur: 2000, hauteur: 400 }));
});

/* ── Tirer la carte ──────────────────────────────────────────────────────── */

test("tirer la carte vers la droite fait aller le centre vers la gauche", () => {
  // On déplace ce qu'on regarde, pas le point de vue. Confondre les deux donne
  // une carte qui part dans le sens inverse du doigt.
  const apres = centreApresGlissement(ICI, { dx: 100, dy: 0, zoom: 18 });
  assert.ok(apres.longitude < ICI.longitude);
  assert.deepEqual(apres, pointADistance(ICI, { dx: -100, dy: 0, zoom: 18 }));
});

/* ── Ce qui ne se calcule pas ────────────────────────────────────────────── */

test("sans centre, on ne rend pas un centre inchangé : on rend `null`", () => {
  // Rendre le centre d'avant laisserait croire qu'on n'a pas bougé.
  assert.equal(pointADistance(null, { dx: 10, dy: 10 }), null);
  assert.equal(pointADistance({ latitude: 44.9 }, { dx: 10, dy: 10 }), null);
  assert.equal(centreApresGlissement(undefined, {}), null);
  assert.equal(pixelsDepuisLeCentre(ICI, null, {}), null);
});

test("sous les pôles, la longitude n'a plus de sens : on refuse", () => {
  assert.equal(pointADistance({ latitude: 90, longitude: 0 }, { dx: 10, dy: 0, zoom: 10 }), null);
});
