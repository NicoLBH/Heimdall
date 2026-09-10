/**
 * Le magasin des propositions ouvertes : ce qu'il rend, et quand.
 *
 * La lecture elle-même n'est pas rejouée ici — elle traverse la base, et ce
 * fichier n'en a pas. Ce qui se teste est la seule chose qui puisse mentir :
 * ce que le magasin **rend en attendant**, et ce qu'il fait quand on change de
 * projet. Les trois réponses ne se confondent pas, et c'est tout l'enjeu.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { store } from "../store.js";
import { branchesOuvertes, oublierLesBranches } from "./branches-ouvertes.js";

test("sans projet affiché, rien n'est proposé et rien n'est prétendu", () => {
  store.currentProjectId = null;
  assert.deepEqual(branchesOuvertes(), []);
});

test("avant que la lecture ait répondu, le menu n'offre rien", () => {
  // `[]`, et non `null` : il n'y a rien à offrir *encore*. Rendre `null` ferait
  // afficher « lecture impossible » à chaque ouverture d'écran, pour une lecture
  // qui est simplement en route.
  oublierLesBranches();
  store.currentProjectId = "aurora-campus";
  assert.deepEqual(branchesOuvertes(), []);
});

test("changer de projet oublie le précédent au lieu de le proposer", () => {
  // Le pire des cas : proposer d'ajouter à une proposition d'un autre projet.
  // La clé de cache est celle de l'écran, immédiate, justement pour que ce
  // basculement se voie sans attendre d'avoir résolu quoi que ce soit.
  oublierLesBranches();
  store.currentProjectId = "aurora-campus";
  branchesOuvertes();
  store.currentProjectId = "autre-projet";
  assert.deepEqual(branchesOuvertes(), []);
});

test("oublier remet le magasin à zéro", () => {
  store.currentProjectId = "aurora-campus";
  branchesOuvertes();
  oublierLesBranches();
  assert.deepEqual(branchesOuvertes(), []);
  store.currentProjectId = null;
});
