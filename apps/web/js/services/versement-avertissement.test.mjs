/**
 * Ce qu'un avertissement dit avant qu'une modification parte en proposition.
 *
 * Ce qui se teste ici est ce qui se lit de travers : « nouveau » contre « on ne
 * sait pas », et le compte qui fait la phrase.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DESTINATION,
  lignesDuLot,
  compteDuLot,
  phraseDuLot,
  destinationRetenue
} from "./versement-avertissement.js";

const enMemoire = (sujet, valeur, dessus = {}) => ({
  id: sujet, payload: { subject: sujet, value: valeur }, ...dessus
});

const MEMOIRE = [
  enMemoire("Localisation du projet", "Saint-Michel-Chef-Chef (44730, INSEE 44182)"),
  enMemoire("Altitude du site", "13,22 m"),
  enMemoire("Zone de neige", "A1")
];

const LOT = [
  { sujet: "Localisation du projet", valeur: "Chamonix-Mont-Blanc (74400, INSEE 74056)" },
  { sujet: "Altitude du site", valeur: "13,22 m" },
  { sujet: "Zone de vent", valeur: "2" }
];

/* ── Ce que le lot montre ────────────────────────────────────────────────── */

test("chaque ligne dit ce qu'elle propose et ce que la mémoire dit aujourd'hui", () => {
  const lignes = lignesDuLot(LOT, MEMOIRE);

  assert.equal(lignes[0].aujourdhui, "Saint-Michel-Chef-Chef (44730, INSEE 44182)");
  assert.equal(lignes[0].bouge, true);
  assert.equal(lignes[0].nouveau, false);

  // Proposée à l'identique : la proposition la portera — c'est ce qui permet de
  // tout rejouer — mais elle ne change rien, et le dire évite de croire qu'on
  // touche à huit choses quand on en touche à une.
  assert.equal(lignes[1].bouge, false);
  assert.equal(lignes[1].nouveau, false);

  assert.equal(lignes[2].aujourdhui, "");
  assert.equal(lignes[2].nouveau, true);
  assert.equal(lignes[2].bouge, false);
});

test("« nouveau » et « on ne sait pas » ne se disent pas de la même façon", () => {
  // Mémoire illisible : `null`. Afficher « nouveau » ferait croire que le projet
  // ne dit rien sur ce sujet, alors qu'on n'a pas pu regarder (règle 5).
  const lignes = lignesDuLot(LOT, null);
  assert.equal(lignes[0].aujourdhui, null);
  assert.equal(lignes[0].nouveau, false);
  assert.equal(lignes[0].bouge, false);
});

test("une ligne remplacée ne compte pas pour l'état d'aujourd'hui", () => {
  const remplacee = [
    enMemoire("Zone de neige", "C2", { superseded_by: "x" }),
    enMemoire("Zone de neige", "A1")
  ];
  const lignes = lignesDuLot([{ sujet: "Zone de neige", valeur: "C2" }], remplacee);
  assert.equal(lignes[0].aujourdhui, "A1");
  assert.equal(lignes[0].bouge, true);
});

test("ce qui n'a pas de sujet ne s'affiche pas, et rien ne tombe", () => {
  assert.deepEqual(lignesDuLot([{ valeur: "0,50 m" }, null], MEMOIRE), []);
  assert.deepEqual(lignesDuLot(null, null), []);
  assert.deepEqual(lignesDuLot(undefined, undefined), []);
});

test("les clés anglaises se lisent aussi : le lot vient de deux formes", () => {
  // `itemsDeProposition` rend `subject`/`value`, les versements rendent
  // `sujet`/`valeur`. Les deux passent par cette fenêtre.
  const lignes = lignesDuLot([{ subject: "Zone de neige", value: "C2" }], MEMOIRE);
  assert.equal(lignes[0].sujet, "Zone de neige");
  assert.equal(lignes[0].propose, "C2");
});

/* ── Le compte, et sa phrase ─────────────────────────────────────────────── */

test("le compte sépare ce qui bouge, ce qui arrive et ce qui ne change rien", () => {
  assert.deepEqual(compteDuLot(lignesDuLot(LOT, MEMOIRE)),
    { total: 3, bougent: 1, nouvelles: 1, inchangees: 1 });
});

test("la phrase s'accorde, et ne prétend rien quand rien ne bouge", () => {
  assert.equal(phraseDuLot({ total: 3, bougent: 1, nouvelles: 1 }), "1 valeur change et 1 arrive.");
  assert.equal(phraseDuLot({ total: 8, bougent: 3, nouvelles: 5 }), "3 valeurs changent et 5 arrivent.");
  assert.equal(phraseDuLot({ total: 2, bougent: 0, nouvelles: 0 }),
    "2 lignes seront portées, et aucune ne change ce que le projet dit aujourd'hui.");
  assert.equal(phraseDuLot({ total: 0, bougent: 0, nouvelles: 0 }), "Rien à proposer.");
  assert.equal(phraseDuLot({}), "Rien à proposer.");
});

/* ── Où le lot va ────────────────────────────────────────────────────────── */

test("un identifiant vide **est** le choix « nouvelle proposition »", () => {
  // C'est aussi ce qu'attend `preparerUneProposition`, qui ouvre quand on ne lui
  // donne rien : une seconde convention obligerait à traduire à chaque appel.
  assert.deepEqual(destinationRetenue(""), { destination: DESTINATION.NEUVE, propositionId: "" });
  assert.deepEqual(destinationRetenue(DESTINATION.NEUVE), { destination: DESTINATION.NEUVE, propositionId: "" });
  assert.deepEqual(destinationRetenue("  "), { destination: DESTINATION.NEUVE, propositionId: "" });
});

test("un identifiant nomme la proposition qu'on enrichit", () => {
  assert.deepEqual(destinationRetenue("p-58"), { destination: DESTINATION.BRANCHE, propositionId: "p-58" });
});
