/**
 * Le garde-fou du titre : un modèle ne produit aucune valeur, et on le vérifie.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  nombresDuTexte,
  valeursInventees,
  redactionRecevable,
  redactionDuTexte,
  REFUS,
  TAILLE_MAX_TITRE,
  TAILLE_MAX_RESUME
} from "./redaction.js";

const FAITS = JSON.stringify({
  lignes: [
    { sujet: "Profondeur hors gel", avant: "0,60 m", apres: "0,66 m", zones: ["Bâtiment A"] },
    { sujet: "Zone de neige", avant: "A1", apres: "A2", zones: [] }
  ],
  compte: { nouveau: 0, correction: 2, retrait: 0, identique: 1 }
});

/* ── Lire les nombres ────────────────────────────────────────────────────── */

test("virgule et point sont la même cote", () => {
  // « 0,66 » et « 0.66 » s'écrivent tous les deux ; refuser l'un pour l'autre
  // écarterait une rédaction juste.
  assert.deepEqual([...nombresDuTexte("0,66")], [...nombresDuTexte("0.66")]);
});

test("un nombre coupé par un espace de milliers reste un nombre", () => {
  // « 1 200 » lu comme « 1 » et « 200 » ferait inventer deux valeurs à un texte
  // qui n'en portait qu'une. L'insécable compte, c'est celle des rédactions
  // françaises.
  assert.deepEqual([...nombresDuTexte("1 200 kN")], ["1200"]);
  assert.deepEqual([...nombresDuTexte("1 200 kN")], ["1200"]);
});

test("un texte sans chiffre n'en porte aucun", () => {
  assert.deepEqual([...nombresDuTexte("Massifs du bâtiment A descendus")], []);
  assert.deepEqual([...nombresDuTexte("")], []);
  assert.deepEqual([...nombresDuTexte(null)], []);
});

/* ── Ce qu'on n'avait pas donné ──────────────────────────────────────────── */

test("un titre qui reprend une cote du diff n'invente rien", () => {
  assert.deepEqual(valeursInventees("Massifs descendus à 0,66 m", FAITS), []);
});

test("perdre la virgule est inventer une valeur", () => {
  // « 66 m » au lieu de « 0,66 m » : c'est exactement la faute qu'une
  // comparaison de chaînes laisserait passer, et qu'une comparaison de nombres
  // attrape.
  assert.deepEqual(valeursInventees("Massifs descendus à 66 m", FAITS), ["66"]);
});

test("un chiffre que le diff ne porte pas se voit, même plausible", () => {
  assert.deepEqual(valeursInventees("Massifs descendus à 0,60 m et 0,80 m", FAITS), ["0.8"]);
});

test("les faits acceptent aussi un objet, pas seulement sa chaîne", () => {
  assert.deepEqual(valeursInventees("à 0,66 m", JSON.parse(FAITS)), []);
});

/* ── La rédaction entière ────────────────────────────────────────────────── */

test("une rédaction qui s'en tient au diff passe", () => {
  const rendu = redactionRecevable({
    titre: "Massifs du bâtiment A descendus à 0,66 m",
    resume: "La cote hors gel passe de 0,60 m à 0,66 m ; la zone de neige suit."
  }, FAITS);

  assert.equal(rendu.ok, true);
  assert.equal(rendu.titre, "Massifs du bâtiment A descendus à 0,66 m");
});

test("une valeur inventée refuse la rédaction entière, et nomme le chiffre", () => {
  // Entière : garder le titre et jeter le résumé laisserait la moitié d'une
  // rédaction qu'on vient de juger fausse, sans qu'on sache laquelle.
  const rendu = redactionRecevable({
    titre: "Massifs descendus à 0,66 m",
    resume: "Une reprise de 12 semelles."
  }, FAITS);

  assert.equal(rendu.ok, false);
  assert.equal(rendu.refus, REFUS.INVENTE);
  assert.deepEqual(rendu.valeurs, ["12"]);
});

test("un titre vide n'est pas une rédaction courte, c'est une absence", () => {
  // Et elle ne doit pas remplacer le titre d'origine.
  assert.deepEqual(redactionRecevable({ titre: "  ", resume: "Quelque chose." }, FAITS),
    { ok: false, refus: REFUS.VIDE });
  assert.deepEqual(redactionRecevable({}, FAITS), { ok: false, refus: REFUS.VIDE });
});

test("un résumé sans titre ne passe pas, un titre sans résumé oui", () => {
  // Le titre est ce qu'on lit dans la liste ; le résumé s'ouvre.
  assert.equal(redactionRecevable({ titre: "Massifs descendus" }, FAITS).ok, true);
  assert.equal(redactionRecevable({ resume: "Massifs descendus" }, FAITS).ok, false);
});

test("un titre trop long est refusé, comme un résumé trop long", () => {
  assert.equal(
    redactionRecevable({ titre: "M".repeat(TAILLE_MAX_TITRE + 1) }, FAITS).refus,
    REFUS.TROP_LONG
  );
  assert.equal(
    redactionRecevable({ titre: "Massifs", resume: "R".repeat(TAILLE_MAX_RESUME + 1) }, FAITS).refus,
    REFUS.TROP_LONG
  );
});

test("les compteurs du diff sont des nombres donnés : les citer n'invente rien", () => {
  // C'est pour cela qu'ils sont envoyés au modèle. Sans eux, « 2 corrections »
  // aurait été refusé comme une valeur inventée — et le refus aurait eu tort.
  assert.equal(redactionRecevable({
    titre: "2 corrections sur les fondations",
    resume: "Deux valeurs changent, une reste identique."
  }, FAITS).ok, true);
});

/* ── Lire ce que le modèle rend ──────────────────────────────────────────── */

test("le JSON se lit, avec ou sans clôture de code", () => {
  // Les clôtures sont une habitude des modèles. Laisser l'appel échouer dessus
  // coûterait un titre ; les retirer coûte deux lignes.
  const attendu = { titre: "Massifs descendus", resume: "à 0,66 m" };
  assert.deepEqual(redactionDuTexte('{"titre":"Massifs descendus","resume":"à 0,66 m"}'), attendu);
  assert.deepEqual(redactionDuTexte('```json\n{"titre":"Massifs descendus","resume":"à 0,66 m"}\n```'), attendu);
  assert.deepEqual(redactionDuTexte('```\n{"titre":"Massifs descendus","resume":"à 0,66 m"}\n```'), attendu);
});

test("ce qui n'est pas un objet lisible rend `null`, jamais un objet vide", () => {
  // Un objet vide se confondrait avec une réponse aux champs vides, et les deux
  // ne se traitent pas pareil : l'une est un refus, l'autre une panne.
  assert.equal(redactionDuTexte("Voici votre titre !"), null);
  assert.equal(redactionDuTexte('["Massifs descendus"]'), null);
  assert.equal(redactionDuTexte(""), null);
  assert.equal(redactionDuTexte(null), null);
});
