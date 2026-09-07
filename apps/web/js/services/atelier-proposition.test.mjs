import test from "node:test";
import assert from "node:assert/strict";

import {
  cleDAffirmation, itemsDeProposition, descriptionDeLaProposition, provenanceRetenue } from "./atelier-proposition.js";

const DEGRE = {
  sujet: "Degré coupe-feu des planchers",
  valeur: "CF 1/2 h",
  nature: "contrainte",
  domaine: "incendie",
  source: "arrêté du 31 janvier 1986 modifié",
  article: "article 6, premier alinéa",
  citation: "…coupe-feu de degré une demi-heure…",
  reference: "planchers",
  atelier: "Incendie — Habitation"
};

test("la clé est le sujet, jamais la valeur", () => {
  // C'est ce qui fait qu'une valeur nouvelle remplace l'ancienne au lieu de
  // coexister avec elle.
  assert.equal(cleDAffirmation(DEGRE), "degre-coupe-feu-des-planchers");
  assert.equal(cleDAffirmation({ ...DEGRE, valeur: "CF 1 h" }), "degre-coupe-feu-des-planchers");
});

test("la portée fait partie de la clé", () => {
  assert.equal(cleDAffirmation({ ...DEGRE, zones: ["Bâtiment B"] }),
    "degre-coupe-feu-des-planchers@batiment-b");
  // Le même découpage écrit dans un autre ordre reste le même découpage.
  assert.equal(cleDAffirmation({ ...DEGRE, zones: ["B", "A"] }),
    cleDAffirmation({ ...DEGRE, zones: ["A", "B"] }));
});

test("un item porte sa nature et son domaine, sans les deviner", () => {
  const [item] = itemsDeProposition([DEGRE]);

  assert.equal(item.itemType, "base-datum");
  assert.equal(item.itemKey, "degre-coupe-feu-des-planchers");
  assert.equal(item.payload.nature, "contrainte");
  assert.equal(item.payload.domain, "incendie");
  assert.equal(item.payload.article, "article 6, premier alinéa");
  assert.equal(item.payload.atelier, "Incendie — Habitation");
});

test("ce qui n'affirme rien n'entre pas dans une proposition", () => {
  assert.deepEqual(itemsDeProposition([{ sujet: "Sans valeur", valeur: "" }]), []);
  assert.deepEqual(itemsDeProposition([{ sujet: "", valeur: "CF 1 h" }]), []);
  assert.deepEqual(itemsDeProposition(null), []);
});

test("une nature absente reste absente : rien ne la devine", () => {
  const [item] = itemsDeProposition([{ sujet: "Zone de neige", valeur: "A1" }]);
  assert.equal(item.payload.nature, null);
  assert.equal(item.payload.domain, null);
});

test("la description se lit avant de signer", () => {
  const texte = descriptionDeLaProposition({
    intro: "Conclusions de l'étude incendie.",
    affirmations: [DEGRE, { ...DEGRE, sujet: "Classement", valeur: "3e famille B", article: "article 3" }],
    source: "arrêté du 31 janvier 1986 modifié"
  });

  assert.match(texte, /Conclusions de l'étude incendie\./);
  assert.match(texte, /- \*\*Degré coupe-feu des planchers\*\* : CF 1\/2 h — article 6, premier alinéa/);
  assert.match(texte, /- \*\*Classement\*\* : 3e famille B — article 3/);
  // Elle dit ce qui n'a pas eu lieu : rien n'est entré en mémoire.
  assert.match(texte, /Rien n'est encore entré dans la mémoire du projet/);
});


test("la provenance voyage avec l'affirmation, son type compris", () => {
  const [item] = itemsDeProposition([{
    sujet: "Profondeur hors gel",
    valeur: "0,935 m",
    provenance: { type: "calcul", quoi: "hors gel (H0 du département = 0,850 m)" },
    statut: "supposé"
  }]);

  assert.deepEqual(item.payload.provenance, { type: "calcul", quoi: "hors gel (H0 du département = 0,850 m)" });
  assert.equal(item.payload.statut, "supposé");
});

test("un type de provenance inventé n'entre pas", () => {
  assert.equal(provenanceRetenue({ type: "oracle", quoi: "une boule de cristal" }), null);
  assert.equal(provenanceRetenue({ type: "texte", quoi: "" }), null);
  assert.equal(provenanceRetenue(null), null);
  assert.deepEqual(provenanceRetenue({ type: "règle", quoi: "Classement du bâtiment" }),
    { type: "règle", quoi: "Classement du bâtiment" });
});

test("un statut inconnu n'entre pas non plus", () => {
  const [item] = itemsDeProposition([{ sujet: "Zone de neige", valeur: "E", statut: "peut-être" }]);
  assert.equal(item.payload.statut, null);
});
