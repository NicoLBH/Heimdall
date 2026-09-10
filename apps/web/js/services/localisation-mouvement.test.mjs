/**
 * Un projet qui bouge de cent mètres a bougé.
 *
 * Ce qui se teste ici est ce qui décidait mal : le rejeu ne regardait que le
 * code INSEE, si bien qu'un déplacement à l'intérieur d'une commune ne
 * déclenchait rien — et qu'une adresse recopiée autrement déclenchait tout.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MOUVEMENT,
  SEUIL_DE_DEPLACEMENT,
  distanceEnMetres,
  distanceDite,
  deplacementEntre,
  laLocalisationABouge
} from "./localisation-mouvement.js";

/** Aucun projet réel : une commune de montagne, prise pour ses dénivelés. */
const ICI = {
  commune: "Briançon", codeInsee: "05023", codePostal: "05100",
  adresse: "12 rue des Cordeliers", latitude: 44.896452, longitude: 6.635087
};

/** Un dix-millième de degré de latitude vaut environ onze mètres. */
const decale = (metres) => ({ ...ICI, latitude: ICI.latitude + metres / 111_320 });

/* ── La distance ─────────────────────────────────────────────────────────── */

test("un degré ne vaut pas la même chose partout : la distance se calcule, elle ne se soustrait pas", () => {
  // Un degré de longitude vaut 111 km à l'équateur et 78 km à Lille. Comparer
  // des degrés reviendrait à dire qu'un projet a moins bougé parce qu'il est
  // plus au nord.
  const equateur = distanceEnMetres({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
  const nord = distanceEnMetres({ latitude: 50, longitude: 0 }, { latitude: 50, longitude: 1 });

  assert.ok(equateur > nord, "un degré de longitude rétrécit vers les pôles");
  assert.ok(Math.abs(equateur - 111_195) < 500);
  assert.ok(Math.abs(nord - 71_700) < 1000);
});

test("cent mètres se mesurent à cent mètres", () => {
  assert.ok(Math.abs(distanceEnMetres(ICI, decale(100)) - 100) < 2);
});

test("sans les deux points, la distance est `null` — jamais zéro", () => {
  // Zéro voudrait dire « au même endroit », ce qu'on ne sait pas.
  assert.equal(distanceEnMetres(ICI, { commune: "Briançon" }), null);
  assert.equal(distanceEnMetres(null, ICI), null);
  assert.equal(distanceEnMetres({ latitude: 44.9 }, ICI), null);
});

/* ── Ce qui sépare deux localisations ────────────────────────────────────── */

test("changer de commune est un déplacement, quelle qu'en soit la distance", () => {
  const ailleurs = { ...ICI, commune: "Chamonix-Mont-Blanc", codeInsee: "74056", latitude: 45.9237, longitude: 6.8694 };
  const rendu = deplacementEntre(ICI, ailleurs);
  assert.equal(rendu.mouvement, MOUVEMENT.COMMUNE);
  assert.match(rendu.phrase, /change de commune/);
  assert.equal(laLocalisationABouge(ICI, ailleurs), true);
});

test("cent mètres dans la même commune sont un déplacement", () => {
  // C'est le cas qui manquait : une commune fait des kilomètres, et l'altitude
  // y varie de mille mètres. Cent mètres, c'est un versant.
  const rendu = deplacementEntre(ICI, decale(100));
  assert.equal(rendu.mouvement, MOUVEMENT.DEPLACE);
  assert.match(rendu.phrase, /Environ 100 m/);
  assert.equal(laLocalisationABouge(ICI, decale(100)), true);
});

test("sous le seuil, le projet n'a pas bougé", () => {
  // Un point posé à la main sur une vue satellite se pose à quelques mètres
  // près. Rejouer toute la chaîne pour cela apprendrait à ignorer l'écran.
  assert.equal(deplacementEntre(ICI, decale(SEUIL_DE_DEPLACEMENT - 10)).mouvement, MOUVEMENT.AUCUN);
  assert.equal(laLocalisationABouge(ICI, decale(SEUIL_DE_DEPLACEMENT - 10)), false);
});

test("le seuil lui-même compte comme un déplacement", () => {
  assert.equal(deplacementEntre(ICI, decale(SEUIL_DE_DEPLACEMENT + 1)).mouvement, MOUVEMENT.DEPLACE);
});

test("corriger une adresse n'est pas déplacer un projet", () => {
  // « 12 rue des Cordeliers » devient « 12 rue des Cordeliers, bât. B ». Rien
  // n'a bougé d'un mètre, et rien n'a à se recalculer.
  const rendu = deplacementEntre(ICI, { ...ICI, adresse: "12 rue des Cordeliers, bât. B" });
  assert.equal(rendu.mouvement, MOUVEMENT.ECRITURE);
  assert.equal(laLocalisationABouge(ICI, { ...ICI, adresse: "12 rue des Cordeliers, bât. B" }), false);
});

test("ne pas savoir compte comme un déplacement", () => {
  // Règle 5 prise par le bon bout : mieux vaut rejouer pour rien que laisser une
  // cote hors gel calculée ailleurs. Sans point, on ne peut pas trancher.
  const sansPoint = { commune: "Briançon", codeInsee: "05023" };
  assert.equal(deplacementEntre(ICI, sansPoint).mouvement, MOUVEMENT.INCONNU);
  assert.equal(laLocalisationABouge(ICI, sansPoint), true);
  assert.equal(laLocalisationABouge(null, ICI), true);
});

/* ── Comment une distance se dit ─────────────────────────────────────────── */

test("une distance s'écrit dans l'unité où elle se lit", () => {
  assert.equal(distanceDite(0.4), "Moins d'un mètre.");
  assert.equal(distanceDite(111), "Environ 111 m.");
  assert.equal(distanceDite(1240), "Environ 1,2 km.");
  assert.equal(distanceDite(null), "");
  assert.equal(distanceDite("pas un nombre"), "");
});
