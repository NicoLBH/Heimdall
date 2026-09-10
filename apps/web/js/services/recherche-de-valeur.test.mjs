/**
 * Trouver la localisation du projet avec les mots qu'on emploie.
 *
 * Ce qui se teste ici est ce qui ne se trouvait pas : « localisation » n'est le
 * nom d'aucune colonne — c'est celui du tableau qui les porte — et « GPS » n'est
 * écrit nulle part.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { aplati, valeursTrouvees, rangDeLaReponse, synonymesDuSujet } from "./recherche-de-valeur.js";
import { SUJET_LOCALISATION, STRUCTURE_DE_LA_LOCALISATION } from "../utilitaires/agents-climatiques.js";

/** Une colonne de la localisation, telle que l'écran de variante l'offre. */
const colonne = (nom) => ({
  id: `loc#${nom}`, sujet: nom, quoi: "",
  assertion: { payload: { subject: SUJET_LOCALISATION } },
  champ: { cle: nom, nom }
});

const ALTITUDE = {
  id: "alt", sujet: "Altitude du site",
  quoi: "L'altitude du terrain naturel au droit du projet.",
  assertion: { payload: { subject: "Altitude du site" } }
};

const TRAME = {
  id: "trame", sujet: "Trame", quoi: "L'entraxe des poteaux.",
  assertion: { payload: { subject: "Trame" } }
};

const SOCLE = [ALTITUDE, TRAME, ...STRUCTURE_DE_LA_LOCALISATION.map((champ) => colonne(champ.nom))];
const noms = (trouvees) => trouvees.map((valeur) => valeur.sujet);

/* ── Les accents et les majuscules ne se tapent pas ──────────────────────── */

test("on cherche sans accents et sans majuscules", () => {
  assert.equal(aplati("Coordonnées GPS"), "coordonnees gps");
  assert.equal(aplati("  Où  "), "ou");
});

/* ── Le tableau porteur se cherche aussi ─────────────────────────────────── */

test("« localisation » ramène les six colonnes, alors qu'aucune ne s'appelle ainsi", () => {
  // C'est le manque principal : le mot est celui du tableau, pas d'une colonne.
  const trouvees = valeursTrouvees(SOCLE, "localisation");
  assert.equal(trouvees.length, STRUCTURE_DE_LA_LOCALISATION.length);
  assert.ok(noms(trouvees).includes("code INSEE"));
  assert.ok(noms(trouvees).includes("latitude"));
});

test("le nom d'une colonne passe devant ses sœurs", () => {
  // « adresse » ramène tout l'endroit, mais la colonne qui s'appelle ainsi vient
  // en tête : c'est celle qu'on visait.
  assert.equal(noms(valeursTrouvees(SOCLE, "adresse"))[0], "adresse");
});

/* ── Les mots qu'on emploie ──────────────────────────────────────────────── */

test("« GPS », « ville », « terrain », « où » ramènent la localisation", () => {
  for (const mot of ["gps", "ville", "terrain", "où", "coordonnées", "parcelle", "site"]) {
    const trouvees = valeursTrouvees(SOCLE, mot);
    assert.ok(noms(trouvees).includes("code INSEE"), `« ${mot} » ne ramène pas la localisation`);
  }
});

test("un synonyme se reconnaît en entier, jamais au milieu d'un mot", () => {
  // « ou » est un synonyme de la localisation. S'il se cherchait comme un
  // fragment, toute colonne de la localisation répondrait à « pour », « couvert »
  // ou « souvent » — et le rail se remplirait de réponses qu'on n'a pas demandées.
  //
  // Le nom, lui, se cherche bien par fragment : c'est ce qui fait que « vent »
  // ramène les quatre cas de vent. Les deux rangs ne se règlent pas pareil.
  assert.equal(rangDeLaReponse(colonne("commune"), "ou"), 2, "« ou » est un synonyme entier");
  assert.equal(rangDeLaReponse(colonne("commune"), "our"), 0, "« our » n'en est pas un");
  assert.equal(rangDeLaReponse(colonne("commune"), "souvent"), 0);

  // Et un fragment de nom reste un fragment de nom, comme avant.
  assert.equal(rangDeLaReponse(colonne("commune"), "mun"), 3);
});

/* ── L'ordre des réponses ────────────────────────────────────────────────── */

test("le nom passe devant le synonyme, qui passe devant la description", () => {
  assert.equal(rangDeLaReponse(colonne("commune"), "commune"), 3);
  assert.equal(rangDeLaReponse(colonne("commune"), "gps"), 2);
  assert.equal(rangDeLaReponse(ALTITUDE, "naturel"), 1);
  assert.equal(rangDeLaReponse(TRAME, "localisation"), 0);
});

test("à rang égal, l'ordre du socle est conservé", () => {
  // La liste est déjà rangée — les plus employées en tête —, et la retrier
  // alphabétiquement ferait chercher.
  assert.deepEqual(
    noms(valeursTrouvees(SOCLE, "localisation")),
    STRUCTURE_DE_LA_LOCALISATION.map((champ) => champ.nom)
  );
});

/* ── Ce qui ne casse pas ─────────────────────────────────────────────────── */

test("sans requête, on rend le socle entier", () => {
  assert.equal(valeursTrouvees(SOCLE, "").length, SOCLE.length);
  assert.equal(valeursTrouvees(SOCLE, "   ").length, SOCLE.length);
});

test("ce qui n'est pas une liste ne fait pas tomber la recherche", () => {
  assert.deepEqual(valeursTrouvees(null, "gps"), []);
  assert.deepEqual(valeursTrouvees(undefined, undefined), []);
  assert.equal(rangDeLaReponse(null, "gps"), 0);
});

test("les synonymes se déclarent, ils ne se devinent pas", () => {
  assert.ok(synonymesDuSujet(SUJET_LOCALISATION).includes("gps"));
  assert.deepEqual(synonymesDuSujet("Trame"), []);
});
