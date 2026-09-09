/**
 * Le diff d'une proposition dit la même chose que le fichier.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { champsDuBloc, reperesDAffirmations } from "./depot-carburants.js";
import { fonctionAEcrire } from "./memoire-domiciles.js";



test("le diff écrit une fonction à agent comme le fichier l'écrit", () => {
  // Le défaut, vu dans une proposition fusionnée : le diff rendait
  // `fonction Prédimensionnement des fondations superficielles()` — pas de
  // signature, pas d'appel, pas d'`enregistre` — puis un `alors (11 massifs);`
  // que le fichier ne porte nulle part. Deux grammaires pour la même ligne.
  const champs = champsDuBloc({
    sujet: "Prédimensionnement des fondations superficielles",
    valeur: "11 massifs",
    referentiel: true,
    fonction: fonctionAEcrire({
      sujet: "Prédimensionnement des fondations superficielles",
      quoi: "Dimensionne les massifs superficiels d'une zone.",
      agent: {
        genre: "agent-D", utilitaire: "dimensionnement_fondations_superficielles", version: "V1",
        lit: ["Profondeur hors gel"],
        ecrit: [{ sujet: "Résultat du calcul des fondations superficielles" }]
      }
    }, new Map([["resultat du calcul des fondations superficielles", "memoire/structure.ctr"]]))
  });

  const texte = Object.values(champs).join("\n");
  assert.match(texte, /^fonction Prédimensionnement des fondations superficielles\(zones, Profondeur hors gel\)/m);
  assert.match(texte, /^ {3}résultat = agent-D \($/m);
  assert.match(texte, /^ {6}utilitaire: dimensionnement_fondations_superficielles,$/m);
  assert.match(texte, /^ {6}dans: memoire\/structure\.ctr,$/m);
  // Et surtout, plus la tête sans signature ni la conclusion d'une règle. Le
  // `alors` qui reste est celui du corps — « alors (X à retenir = X) » —, que
  // le fichier écrit aussi.
  assert.doesNotMatch(texte, /fondations superficielles\(\)/);
  assert.doesNotMatch(texte, /alors \(11 massifs\)/);
  assert.match(texte, /^ {3}alors \(Profondeur hors gel à retenir = Profondeur hors gel\)$/m);
});

test("le diff nomme le fichier que la mémoire crée, pas un autre", () => {
  // Il le recalculait depuis le seul `{nature, domaine}` de la ligne. Deux
  // réponses à la même question, et le diff pouvait annoncer un fichier que la
  // mémoire ne crée pas — jusqu'à `.mdall`, qui n'est l'extension de rien.
  const [repere] = reperesDAffirmations({ lignes: [{
    cle: "resultat", sujet: "Résultat du calcul des fondations superficielles",
    nature: "contrainte", domaine: "structure", avant: "", apres: "11 massifs",
    rangement: { chemin: ["Mémoire", "Structure"], extension: "ctr", fichier: "memoire/structure.ctr" }
  }] }).apres;

  assert.deepEqual(repere.chemin, ["Mémoire", "Structure"]);
  assert.equal(repere.extension, "ctr");
});
