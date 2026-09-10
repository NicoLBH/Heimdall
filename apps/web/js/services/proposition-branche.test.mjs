/**
 * Une branche : une proposition ouverte qu'on enrichit, et les trois choses
 * qu'elle doit dire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  branchesQuiAccueillent,
  libelleDeLaBranche,
  itemsPortablesDansLaBranche,
  collisionsEntreBranches,
  laMemoireABougeSousLaBranche
} from "./proposition-branche.js";

const ouverte = (dessus = {}) => ({
  id: "p1", number: 58, title: "Reprise des fondations", status: "open",
  created_at: "2026-08-01T10:00:00Z", ...dessus
});

const item = (cle, dessus = {}) => ({
  itemType: "base-datum", itemKey: cle, status: "proposed",
  payload: { subject: cle.replace(/-/g, " ") }, ...dessus
});

/* ── Celles qui accueillent ──────────────────────────────────────────────── */

test("seules les propositions ouvertes accueillent", () => {
  const liste = branchesQuiAccueillent([
    ouverte(), ouverte({ id: "p2", status: "merged" }), ouverte({ id: "p3", status: "closed" })
  ]);
  assert.deepEqual(liste.map((p) => p.id), ["p1"]);
});

test("une base qui n'a pas répondu ne dit pas « aucune »", () => {
  // Le dire ferait ouvrir une deuxième branche à côté de celle qu'on ne voyait
  // pas. `null` se propage ; une liste vide, elle, est une réponse.
  assert.equal(branchesQuiAccueillent(null), null);
  assert.equal(branchesQuiAccueillent(undefined), null);
  assert.deepEqual(branchesQuiAccueillent([]), []);
});

test("une branche s'annonce par son numéro et son titre", () => {
  assert.equal(libelleDeLaBranche(ouverte()), "#58 Reprise des fondations");
  // Sans numéro — une proposition que la base vient d'ouvrir : le titre suffit,
  // et « #NaN » ne serait pas un numéro.
  assert.equal(libelleDeLaBranche(ouverte({ number: null })), "Reprise des fondations");
  assert.equal(libelleDeLaBranche(ouverte({ title: "" })), "#58 Sans titre");
});

/* ── Ce qu'on écraserait ─────────────────────────────────────────────────── */

test("porter une clé déjà tranchée n'efface pas la décision : on la retient", () => {
  // Le versement remet chaque item à « proposé » et efface qui avait décidé. Sur
  // une clé refusée, ce serait effacer un refus sans le dire — et un refus effacé
  // est un refus qu'on ne pourra pas contester.
  const { portables, tranches } = itemsPortablesDansLaBranche(
    [item("zone-de-neige"), item("profondeur-hors-gel")],
    [{ itemType: "base-datum", itemKey: "zone-de-neige", status: "refused",
       payload: { subject: "Zone de neige" } }]
  );

  assert.deepEqual(portables.map((i) => i.itemKey), ["profondeur-hors-gel"]);
  assert.deepEqual(tranches, [
    { cle: "zone-de-neige", nom: "Zone de neige", statut: "refused" }
  ]);
});

test("une clé encore proposée se remplace : c'est le geste même de la branche", () => {
  const { portables, tranches } = itemsPortablesDansLaBranche(
    [item("zone-de-neige", { payload: { subject: "Zone de neige", value: "A2" } })],
    [item("zone-de-neige", { payload: { subject: "Zone de neige", value: "A1" } })]
  );
  assert.equal(portables.length, 1);
  assert.equal(portables[0].payload.value, "A2");
  assert.deepEqual(tranches, []);
});

test("deux types différents sous la même clé ne se heurtent pas", () => {
  // La clé n'est unique qu'à l'intérieur de son type — c'est la contrainte de la
  // base, et la comparer sans le type ferait retenir un item qui n'entre en
  // conflit avec rien.
  const { portables, tranches } = itemsPortablesDansLaBranche(
    [item("annecy", { itemType: "document" })],
    [item("annecy", { itemType: "base-datum", status: "accepted" })]
  );
  assert.equal(portables.length, 1);
  assert.deepEqual(tranches, []);
});

/* ── Ce que deux branches se disputent ───────────────────────────────────── */

test("deux branches ouvertes sur le même sujet se le disent", () => {
  const collisions = collisionsEntreBranches({
    items: [item("zone-de-neige"), item("zone-de-vent")],
    ailleurs: [{
      proposition: ouverte({ id: "p2", number: 61, title: "Mise à jour incendie" }),
      items: [item("zone-de-neige"), item("degre-cf")]
    }]
  });

  assert.deepEqual(collisions, [{
    cle: "zone-de-neige", nom: "zone de neige",
    propositionId: "p2", numero: 61, titre: "Mise à jour incendie"
  }]);
});

test("une ligne par sujet, jamais une par item", () => {
  // La leçon de `versementsHorsDomicile` : ce qui se règle, c'est le sujet, et le
  // répéter pour chaque branche qui le touche ferait lire trois conflits là où il
  // y en a un à trancher.
  const collisions = collisionsEntreBranches({
    items: [item("zone-de-neige")],
    ailleurs: [
      { proposition: ouverte({ id: "p2" }), items: [item("zone-de-neige")] },
      { proposition: ouverte({ id: "p3" }), items: [item("zone-de-neige")] }
    ]
  });
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].propositionId, "p2");
});

test("une branche fusionnée ou abandonnée ne dispute plus rien", () => {
  const collisions = collisionsEntreBranches({
    items: [item("zone-de-neige")],
    ailleurs: [
      { proposition: ouverte({ id: "p2", status: "merged" }), items: [item("zone-de-neige")] },
      { proposition: ouverte({ id: "p3", status: "closed" }), items: [item("zone-de-neige")] }
    ]
  });
  assert.deepEqual(collisions, []);
});

test("l'intendance ne se dispute pas : deux dépôts du même fichier ne se contredisent pas", () => {
  const collisions = collisionsEntreBranches({
    items: [item("doc-12", { itemType: "document" })],
    ailleurs: [{ proposition: ouverte({ id: "p2" }), items: [item("doc-12", { itemType: "document" })] }]
  });
  assert.deepEqual(collisions, []);
});

/* ── Ce que la mémoire a changé dessous ──────────────────────────────────── */

const memoire = (cle, quand, dessus = {}) => ({
  id: `a-${cle}-${quand}`, subject_key: cle, decided_at: quand, ...dessus
});

test("un sujet redécidé après l'ouverture fait vieillir la branche, et se nomme", () => {
  // « Quelque chose a bougé » enverrait chercher quoi dans toute la mémoire. Le
  // sujet, lui, se lit et se règle.
  const { lue, sujets } = laMemoireABougeSousLaBranche({
    proposition: ouverte(),
    items: [item("zone-de-neige"), item("zone-de-vent")],
    assertions: [
      memoire("zone-de-neige", "2026-08-20T09:00:00Z"),
      memoire("zone-de-vent", "2026-07-01T09:00:00Z")
    ]
  });

  assert.equal(lue, true);
  assert.deepEqual(sujets, [
    { cle: "zone-de-neige", nom: "zone de neige", depuis: "2026-08-20T09:00:00Z" }
  ]);
});

test("ce que la branche a elle-même écrit ne lui a pas bougé sous les pieds", () => {
  const { sujets } = laMemoireABougeSousLaBranche({
    proposition: ouverte(),
    items: [item("zone-de-neige")],
    assertions: [memoire("zone-de-neige", "2026-08-20T09:00:00Z", { proposition_id: "p1" })]
  });
  assert.deepEqual(sujets, []);
});

test("une affirmation remplacée ne fait pas vieillir : c'est celle qui vaut qui compte", () => {
  const { sujets } = laMemoireABougeSousLaBranche({
    proposition: ouverte(),
    items: [item("zone-de-neige")],
    assertions: [memoire("zone-de-neige", "2026-08-20T09:00:00Z", { superseded_by: "a-99" })]
  });
  assert.deepEqual(sujets, []);
});

test("une mémoire illisible ne se prétend pas immobile", () => {
  // Répondre « rien n'a bougé » ferait signer en croyant avoir vérifié. Règle 5.
  const rendu = laMemoireABougeSousLaBranche({
    proposition: ouverte(), items: [item("zone-de-neige")], assertions: null
  });
  assert.deepEqual(rendu, { lue: false, sujets: [] });
});

test("une branche qui ne touche aucun sujet ne vieillit de rien", () => {
  const rendu = laMemoireABougeSousLaBranche({
    proposition: ouverte(), items: [], assertions: [memoire("zone-de-neige", "2026-09-01T09:00:00Z")]
  });
  assert.deepEqual(rendu, { lue: true, sujets: [] });
});
