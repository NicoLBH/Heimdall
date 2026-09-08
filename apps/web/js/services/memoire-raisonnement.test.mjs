import test from "node:test";
import assert from "node:assert/strict";

import {
  chaineDuRaisonnement, valeurDuSujet, reglesQuiProduisent, traceDesLignes
} from "./memoire-raisonnement.js";
import { blocDeRegle, OPERATEUR } from "./memoire-en-texte.js";

/** Une règle appliquée, telle que la mémoire la porte. */
const regle = (sujet, valeur, entrees = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: { conditions: entrees.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })), sauf: [] }
  }
});

/** Une valeur du projet, avec sa portée. */
const valeur = (sujet, dite, zones = null) => ({
  id: `a-${sujet}-${zones ?? "partout"}`, subject_key: sujet, status: "assumed", superseded_by: null,
  payload: { subject: sujet, value: dite, ...(zones ? { zones: [zones] } : {}) }
});

test("la chaîne remonte des données de base jusqu'au résultat", () => {
  // Colonne sèche ← Classement ← Hauteur. On lit ce dont une règle a besoin
  // avant elle, comme on lit l'arrêté avant la note de synthèse.
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    regle("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    valeur("Hauteur du plancher bas", "26 m"),
    valeur("Colonne sèche", "exigée")
  ];

  const { fonctions, entrees, manquants } = chaineDuRaisonnement("Colonne sèche", memoire);

  assert.deepEqual(fonctions.map((f) => f.payload.subject), ["Classement du bâtiment", "Colonne sèche"]);
  assert.deepEqual(entrees, ["Hauteur du plancher bas"]);
  assert.deepEqual(manquants, []);
});

test("ce sur quoi la chaîne s'appuie sans que personne l'ait versé se nomme", () => {
  // C'est le trou du raisonnement, et c'est la première chose qu'on veut voir
  // devant une valeur qu'on ne s'explique pas.
  const { entrees, manquants } = chaineDuRaisonnement("Colonne sèche", [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"])
  ]);

  assert.deepEqual(entrees, ["Classement du bâtiment"]);
  assert.deepEqual(manquants, ["Classement du bâtiment"]);
});

test("un cycle ne fige pas l'écran", () => {
  // Un référentiel mal versé doit se voir, pas bloquer.
  const { fonctions } = chaineDuRaisonnement("A", [regle("A", "1", ["B"]), regle("B", "2", ["A"])]);
  assert.deepEqual(fonctions.map((f) => f.payload.subject).sort(), ["A", "B"]);
});

test("une valeur se lit dans sa zone, jamais dans celle du voisin", () => {
  const memoire = [
    valeur("Degré coupe-feu", "CF 1 h"),
    valeur("Degré coupe-feu", "CF 1/2 h", "Bâtiment A")
  ];

  assert.equal(valeurDuSujet("Degré coupe-feu", memoire, "Bâtiment A").valeur, "CF 1/2 h");
  // Une zone sans valeur propre retombe sur ce qui vaut partout…
  assert.equal(valeurDuSujet("Degré coupe-feu", memoire, "Bâtiment B").valeur, "CF 1 h");
  // …et jamais sur celle d'une autre zone : sans valeur générale, on ne dit rien.
  assert.equal(valeurDuSujet("Degré coupe-feu", [memoire[1]], "Bâtiment B"), null);
});

test("une règle remplacée ne produit plus rien", () => {
  const perimee = { ...regle("Colonne sèche", "exigée"), superseded_by: "autre" };
  assert.equal(reglesQuiProduisent([perimee]).size, 0);
});

test("chaque ligne de code dit ce que son nom vaut aujourd'hui", () => {
  const lignes = blocDeRegle({
    sujet: "Colonne sèche",
    conditions: [{ sujet: "Classement du bâtiment", operateur: OPERATEUR.EGAL, valeur: "3e famille B" }],
    alors: "exigée"
  }).map((jetons) => ({ jetons }));

  const trace = traceDesLignes(lignes, {
    assertions: [valeur("Classement du bâtiment", "3e famille B")],
    zone: "Bâtiment A"
  });

  // La ligne de condition porte la valeur du nom qu'elle teste…
  const condition = trace.find((entree) => entree.sujet === "Classement du bâtiment");
  assert.equal(condition.valeur, "3e famille B");
  // …et ce que personne n'a versé se dit manquant plutôt que vide.
  const tete = trace.find((entree) => entree.sujet === "Colonne sèche");
  assert.equal(tete.manquant, true);
});
