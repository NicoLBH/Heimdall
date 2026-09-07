import test from "node:test";
import assert from "node:assert/strict";

import { comparerDesReperes, arbreDesReperes, lignesNumerotees, resumeDuDiff, ETAT } from "./depot-reperes.js";
import {
  reperesDAvis, reperesDAffirmations, reperesDeDocuments, reperesDuDepot, CARBURANTS
} from "./depot-carburants.js";

const repere = (id, champs, extra = {}) => ({
  id, famille: "test", chemin: ["Rubrique"], titre: id, champs, ...extra
});

test("un repère absent d'un côté est un ajout, absent de l'autre un retrait", () => {
  const { lignes, compte } = comparerDesReperes({
    avant: [repere("a", { Valeur: "1" })],
    apres: [repere("b", { Valeur: "2" })]
  });

  assert.equal(lignes.find((l) => l.id === "b").etat, ETAT.AJOUTE);
  assert.equal(lignes.find((l) => l.id === "a").etat, ETAT.RETIRE);
  assert.equal(compte.ajoute, 1);
  assert.equal(compte.retire, 1);
});

test("un champ qui bouge fait une modification, et se dit champ par champ", () => {
  const { lignes } = comparerDesReperes({
    avant: [repere("a", { "État": "Ouvert", "Appréciation": "à traiter" })],
    apres: [repere("a", { "État": "Levé", "Appréciation": "à traiter" })]
  });

  assert.equal(lignes[0].etat, ETAT.MODIFIE);
  const etat = lignes[0].champs.find((c) => c.nom === "État");
  assert.equal(etat.avant, "Ouvert");
  assert.equal(etat.apres, "Levé");
  assert.equal(lignes[0].champs.find((c) => c.nom === "Appréciation").etat, ETAT.INCHANGE);
});

test("deux états identiques ne se déclarent pas modifiés", () => {
  const { lignes, compte } = comparerDesReperes({
    avant: [repere("a", { Valeur: "1" })],
    apres: [repere("a", { Valeur: "1" })]
  });

  assert.equal(lignes[0].etat, ETAT.INCHANGE);
  assert.equal(compte.inchange, 1);
});

test("un repère sans identité ne se compare pas : il est écarté", () => {
  const { lignes } = comparerDesReperes({ apres: [{ famille: "x", champs: {} }, repere("a", {})] });
  assert.deepEqual(lignes.map((l) => l.id), ["a"]);
});

test("ce que le dépôt apporte se lit avant ce qu'il laisse derrière", () => {
  const { lignes } = comparerDesReperes({
    avant: [repere("vieux", { Valeur: "1" })],
    apres: [repere("neuf", { Valeur: "2" })]
  });
  assert.deepEqual(lignes.map((l) => l.id), ["neuf", "vieux"]);
});

test("l'arborescence groupe par chemin et compte ce qui bouge", () => {
  const { lignes } = comparerDesReperes({
    apres: [
      repere("a", { V: "1" }, { chemin: ["Avis", "Incendie"] }),
      repere("b", { V: "2" }, { chemin: ["Avis", "Structure"] })
    ],
    avant: [repere("a", { V: "1" }, { chemin: ["Avis", "Incendie"] })]
  });

  const arbre = arbreDesReperes(lignes);
  assert.deepEqual(arbre.map((g) => g.cle), ["Avis / Incendie", "Avis / Structure"]);
  assert.equal(arbre.find((g) => g.cle === "Avis / Incendie").compte, 0);
  assert.equal(arbre.find((g) => g.cle === "Avis / Structure").compte, 1);
});

test("le résumé met ce qui bouge en tête", () => {
  assert.equal(resumeDuDiff({ modifie: 2, ajoute: 1, retire: 0, inchange: 7 }),
    "2 modifiés · 1 ajouté · 7 inchangés");
  assert.equal(resumeDuDiff({}), "Rien à comparer.");
});

/* ── Les carburants ──────────────────────────────────────────────────────── */

test("un avis ajouté n'a pas d'avant : on ne lui en invente pas un", () => {
  const { avant, apres } = reperesDAvis([
    { itemType: "avis", itemKey: "A-12", payload: { change: "added", reference: "A-12", status: "OPEN", domain: "incendie" } }
  ]);

  assert.equal(avant.length, 0);
  assert.equal(apres.length, 1);
  // Un avis est un constat : il se range par domaine, et son extension `.cst`
  // dit ce qu'il est.
  assert.deepEqual(apres[0].chemin, ["Mémoire", "Incendie"]);
  assert.equal(apres[0].id, "avis:A-12");
});

test("un avis dont l'état change porte les deux états", () => {
  const compare = comparerDesReperes(reperesDAvis([
    {
      itemType: "avis", itemKey: "A-12",
      payload: { change: "changed", reference: "A-12", rubric: "Incendie",
        previousStatus: "OPEN", status: "RESOLVED", previousOpinion: "à traiter", opinion: "traité" }
    }
  ]));

  assert.equal(compare.lignes[0].etat, ETAT.MODIFIE);
  assert.equal(compare.lignes[0].champs.filter((c) => c.etat === ETAT.MODIFIE).length, 2);
});

test("les affirmations reprennent le tableau avant/après sans le recalculer", () => {
  const { avant, apres } = reperesDAffirmations({
    lignes: [
      { cle: "degre-cf", sujet: "Degré coupe-feu", domaine: "incendie", avant: "CF 1/2 h", apres: "CF 1 h" },
      { cle: "zone-neige", sujet: "Zone de neige", domaine: "structure", avant: "", apres: "A2" }
    ]
  });

  assert.equal(avant.length, 1);
  assert.equal(apres.length, 2);
  const compare = comparerDesReperes({ avant, apres });
  assert.equal(compare.compte.modifie, 1);
  assert.equal(compare.compte.ajoute, 1);
});

test("un livrable refusé sort du corpus au lieu d'y entrer", () => {
  const compare = comparerDesReperes(reperesDeDocuments([
    { itemType: "document", itemKey: "d1", status: "accepted", payload: { name: "Rapport.pdf" } },
    { itemType: "document", itemKey: "d2", status: "refused", payload: { name: "Brouillon.pdf" } }
  ]));

  assert.equal(compare.lignes.find((l) => l.id === "document:d1").etat, ETAT.AJOUTE);
  assert.equal(compare.lignes.find((l) => l.id === "document:d2").etat, ETAT.RETIRE);
});

test("tous les carburants passent par la même porte", () => {
  const compare = comparerDesReperes(reperesDuDepot({
    items: [
      { itemType: "avis", itemKey: "A-1", payload: { change: "added", reference: "A-1", status: "OPEN" } },
      { itemType: "document", itemKey: "d1", payload: { name: "R.pdf" } },
      { itemType: "attachment", itemKey: "af1", payload: { label: "Affaire 12", verdict: "rattachée" } }
    ],
    avantApres: { lignes: [{ cle: "k", sujet: "Sujet", domaineLabel: "Sol", avant: "", apres: "2 bars" }] }
  }));

  assert.deepEqual([...new Set(compare.lignes.map((l) => l.famille))].sort(),
    ["affirmation", "avis", "document", "rattachement"]);
});

test("chaque carburant déclaré sait se lire sans données", () => {
  for (const carburant of CARBURANTS) {
    const lu = carburant.lire({ items: [], avantApres: null });
    assert.deepEqual(lu.avant, []);
    assert.deepEqual(lu.apres, []);
  }
});

test("les lignes d'un groupe portent deux numéros, comme un diff unifié", () => {
  const { lignes } = comparerDesReperes({
    avant: [repere("a", { Valeur: "A1" }), repere("c", { Valeur: "2" })],
    apres: [repere("a", { Valeur: "A2" }), repere("b", { Valeur: "490" }), repere("c", { Valeur: "2" })]
  });

  const numerotees = lignesNumerotees(arbreDesReperes(lignes)[0]);

  assert.deepEqual(
    numerotees.map((l) => [l.gauche, l.droite, l.signe, l.valeur]),
    [
      [1, null, "-", "A1"],
      [null, 1, "+", "A2"],
      [null, 2, "+", "490"],
      [2, 3, " ", "2"]
    ]
  );
});

test("le nom d'une ligne ne porte le champ que si celui-ci en a un", () => {
  const { lignes } = comparerDesReperes({
    apres: [
      repere("un", { "": "un = \"A2\"" }),
      repere("deux", { "État": "Levé", "Appréciation": "conforme" })
    ]
  });

  const noms = lignesNumerotees(arbreDesReperes(lignes)[0]).map((l) => l.nom);
  // Le champ sans nom est la tête du bloc : il porte déjà le titre, et
  // « un · » ne dirait rien de plus.
  assert.deepEqual(noms, ["un", "deux · État", "deux · Appréciation"]);
});

test("une hypothèse qui devient un relevé est un changement, même à valeur égale", () => {
  const { avant, apres } = reperesDAffirmations({
    lignes: [{
      cle: "gel", sujet: "Profondeur hors gel",
      nature: "contrainte", domaine: "structure",
      avant: "0,935 m", apres: "0,935 m",
      provenanceAvant: { type: "hypothèse", quoi: "altitude inconnue, calcul à 150 m" },
      statutAvant: "supposé",
      provenance: { type: "calcul", quoi: "hors gel (altitude du site = 490,03 m)" },
      statut: "retenu"
    }]
  });

  const compare = comparerDesReperes({ avant, apres });
  const ligne = compare.lignes.find((entree) => entree.id === "affirmation:gel");
  const changes = ligne.champs.filter((champ) => champ.etat !== ETAT.INCHANGE);

  assert.deepEqual(changes.map((champ) => champ.nom).sort(), ["provenance", "statut"]);
  // La valeur d'un champ **est** la ligne du fichier : le diff d'un `.ctr`
  // ressemble à un `.ctr`.
  const provenance = changes.find((champ) => champ.nom === "provenance");
  assert.match(provenance.avant, /^\s+hypothèse: altitude inconnue/);
  assert.match(provenance.apres, /^\s+calcul: hors gel/);
});

test("un champ absent des deux côtés ne s'invente pas", () => {
  const { apres } = reperesDAffirmations({
    lignes: [{ cle: "neige", sujet: "Zone de neige", apres: "A1" }]
  });
  // Une seule ligne : la tête. Pas de provenance vide, pas de statut creux.
  assert.deepEqual(Object.keys(apres[0].champs), [""]);
  assert.equal(apres[0].champs[""], 'Zone de neige = "A1"');
});

test("un seuil de l'arrêté qui bouge est le seul changement que le projet puisse voir", () => {
  const regle = (seuil) => ({
    conditions: [{ sujet: "Hauteur du plancher bas du logement le plus haut", operateur: "<=", valeur: [seuil], unite: "m" }],
    sinon: "", sauf: []
  });

  const { avant, apres } = reperesDAffirmations({
    lignes: [{
      cle: "classement", sujet: "Classement du bâtiment", domaine: "incendie",
      referentiel: true, zones: ["Escalier B"],
      avant: "3e famille B", apres: "3e famille B",
      regleAvant: regle("28"), regle: regle("30")
    }]
  });

  // Le domaine, et l'extension dit que ce sont des règles.
  assert.deepEqual(apres[0].chemin, ["Mémoire", "Incendie"]);
  assert.equal(apres[0].extension, "ref");

  const compare = comparerDesReperes({ avant, apres });
  const ligne = compare.lignes.find((entree) => entree.id === "affirmation:classement");
  const change = ligne.champs.find((champ) => champ.etat !== ETAT.INCHANGE);

  // La condition se nomme par son sujet : réordonner n'invente aucun changement.
  assert.equal(change.nom, "si Hauteur du plancher bas du logement le plus haut");
  assert.match(change.avant, /<= 28 m\)$/);
  assert.match(change.apres, /<= 30 m\)$/);
});

test("un diff de règles ressemble à un fichier de règles", () => {
  const { apres } = reperesDAffirmations({
    lignes: [{
      cle: "classement", sujet: "Classement du bâtiment", domaine: "incendie", referentiel: true,
      apres: "3e famille B",
      regle: {
        conditions: [
          { sujet: "Logements superposés", operateur: "=", valeur: ["oui"], logique: true },
          { sujet: "Hauteur du plancher bas", operateur: "<=", valeur: ["28"], unite: "m", joint: "et" }
        ],
        sinon: "", sauf: []
      },
      provenance: { type: "texte", quoi: "arrêté du 31 janvier 1986, article 3" },
      preuve: "Troisième famille B : …"
    }]
  });

  // Une règle s'écrit comme elle s'exécute : `fonction`, une parenthèse par
  // clause, un point-virgule sur ce qu'elle pose. Le diff montre le fichier.
  assert.deepEqual(Object.values(apres[0].champs), [
    "fonction Classement du bâtiment(Logements superposés, Hauteur du plancher bas)",
    "   si (Logements superposés = oui)",
    "   et (Hauteur du plancher bas <= 28 m)",
    '   alors ("3e famille B");',
    "   texte: arrêté du 31 janvier 1986, article 3",
    '      parce que: "Troisième famille B : …"'
  ]);
});
