import test from "node:test";
import assert from "node:assert/strict";

import {
  conclusionsVersables, cleDuVersement, etatDuVersement, retenuesParDefaut, phraseDuVersement, reglesVersables,
  donneesDeBaseVersables } from "./incendie-versement.js";

const VUE = {
  modules: [
    {
      id: "classement", titre: "Classement du bâtiment", statut: "conclu", exigence: true, valeur: "3e famille B",
      pourquoi: { article: "3", paragraphe: "3°", citation: "Troisième famille B : habitations…" }
    },
    {
      id: "planchersCoupeFeu", titre: "Degré coupe-feu des planchers", statut: "conclu", exigence: true, valeur: "CF 1 h",
      pourquoi: { article: "6", citation: "…coupe-feu de degré une heure…" }
    },
    // Sans objet : elle a conclu, et elle n'affirme rien à respecter.
    {
      id: "circulationProtegeeExigee", titre: "Circulation horizontale protégée", statut: "conclu",
      exigence: true, valeur: null, sansObjet: "aucune circulation protégée n'est exigée"
    },
    // En attente : rien à verser.
    { id: "conduitsExigence", titre: "Conduits", statut: "enAttente", exigence: true, valeur: null, manque: ["diametreConduit"] },
    // Une reformulation du cas : elle a conclu, elle dit quelque chose, et elle
    // n'exige rien de personne.
    { id: "sousSol", titre: "Sous-sol du bâtiment", statut: "conclu", exigence: false, valeur: "avec sous-sol" }
  ]
};

function assertion(cle, valeur, { zones = null } = {}) {
  return {
    id: `a-${cle}`, subject_key: cle, kind: "base-datum", nature: "contrainte",
    statement: `x : ${valeur}`, payload: { value: valeur }, zones, superseded_by: null
  };
}

test("on ne verse que ce qui a conclu et qui dit quelque chose", () => {
  const versables = conclusionsVersables(VUE);
  assert.deepEqual(versables.map((c) => c.id), ["classement", "planchersCoupeFeu"]);
  assert.equal(versables[0].valeur, "3e famille B");
  assert.equal(versables[0].article, "article 3, 3°");
  assert.equal(versables[1].article, "article 6");
  assert.match(versables[1].citation, /coupe-feu de degré une heure/);
});

test("une vue vide ne verse rien, et ne casse rien", () => {
  assert.deepEqual(conclusionsVersables(null), []);
  assert.deepEqual(conclusionsVersables({ modules: "pas un tableau" }), []);
});

test("la clé porte la zone quand il y en a une", () => {
  const conclusion = { sujet: "Degré coupe-feu des planchers" };
  assert.equal(cleDuVersement(conclusion), "degre-coupe-feu-des-planchers");
  assert.equal(cleDuVersement(conclusion, "batiment-b"), "degre-coupe-feu-des-planchers@batiment-b");
});

test("trois états, et ils n'appellent pas le même geste", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), [
    assertion("classement-du-batiment", "3e famille B"),
    assertion("degre-coupe-feu-des-planchers", "CF 1/2 h")
  ]);

  assert.equal(lignes[0].etat, "identique");
  assert.equal(lignes[1].etat, "differente");
  assert.equal(lignes[1].valeurConnue, "CF 1/2 h");
});

test("une conclusion que la mémoire ignore est absente", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), []);
  assert.deepEqual(lignes.map((l) => l.etat), ["absente", "absente"]);
  assert.equal(lignes[0].deja, null);
});

test("le degré du bâtiment A ne dit rien de celui du bâtiment B", () => {
  // La mémoire porte une valeur sur une zone ; on verse sur l'ensemble. Les
  // confondre ferait périmer l'un par l'autre alors que les deux sont vrais.
  const memoire = [assertion("degre-coupe-feu-des-planchers@batiment-b", "CF 1 h", { zones: ["batiment-b"] })];

  assert.equal(etatDuVersement(conclusionsVersables(VUE), memoire)[1].etat, "absente");
  assert.equal(etatDuVersement(conclusionsVersables(VUE), memoire, "batiment-b")[1].etat, "identique");
});

test("une affirmation périmée ne compte pas", () => {
  const perimee = { ...assertion("degre-coupe-feu-des-planchers", "CF 2 h"), superseded_by: "autre" };
  assert.equal(etatDuVersement(conclusionsVersables(VUE), [perimee])[1].etat, "absente");
});

test("ce que la mémoire porte déjà à l'identique n'est pas coché", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), [
    assertion("classement-du-batiment", "3e famille B")
  ]);
  const retenues = retenuesParDefaut(lignes);

  assert.equal(retenues.has("classement"), false);
  assert.equal(retenues.has("planchersCoupeFeu"), true);
});

test("la phrase dit ce qui partira", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), [
    assertion("degre-coupe-feu-des-planchers", "CF 1/2 h")
  ]);

  assert.equal(phraseDuVersement(lignes, retenuesParDefaut(lignes)),
    "2 contraintes partiront — 1 nouvelle, 1 qui corrige la mémoire.");
  assert.equal(phraseDuVersement(lignes, new Set()), "Rien à proposer : aucune conclusion retenue.");
});

test("les règles appliquées partent avec les valeurs qu'elles produisent", () => {
  const vue = {
    texteDeReference: { source: "arrêté du 31 janvier 1986 modifié" },
    modules: [{
      id: "classement", titre: "Classement du bâtiment", statut: "conclu",
      valeur: "3e famille B", exigence: true,
      conditions: [
        { sujet: "Logements superposés", operateur: "=", valeur: "oui", unite: null, logique: true },
        { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: "<=", valeur: 28, unite: "m", logique: false }
      ],
      pourquoi: { article: "3", paragraphe: "3°)", citation: "Troisième famille B : …" }
    }]
  };

  const conclusions = conclusionsVersables(vue);
  const regles = reglesVersables(conclusions, "");

  assert.equal(regles.length, 1);
  const [regle] = regles;
  assert.equal(regle.referentiel, true);
  assert.equal(regle.sujet, "Classement du bâtiment");
  // Ce que la règle conclut. `alors` n'est pas stocké deux fois : l'écriture le
  // remet depuis la valeur.
  assert.equal(regle.valeur, "3e famille B");
  assert.deepEqual(regle.regle.conditions.map((c) => [c.sujet, c.operateur]), [
    ["Logements superposés", "="],
    ["Hauteur du plancher bas du logement le plus haut", "<="]
  ]);
  // Le seuil du texte, jamais la cote du projet.
  assert.deepEqual(regle.regle.conditions[1].valeur, ["28"]);
  assert.equal(regle.regle.conditions[1].unite, "m");
  assert.equal(regle.provenance.type, "texte");
});

test("une règle appliquée porte sa zone : deux escaliers, deux classements", () => {
  const vue = {
    modules: [{
      id: "m", titre: "Colonne sèche", statut: "conclu", valeur: "exigée", exigence: true,
      conditions: [{ sujet: "Classement du bâtiment", operateur: "=", valeur: "3e famille B", unite: null, logique: false }],
      pourquoi: { article: "98" }
    }]
  };

  const [regle] = reglesVersables(conclusionsVersables(vue), "Escalier B");
  // Le texte de l'arrêté est universel ; les règles appliquées ne le sont pas.
  assert.deepEqual(regle.zones, ["Escalier B"]);

  const [partout] = reglesVersables(conclusionsVersables(vue), "");
  assert.deepEqual(partout.zones, []);
});

test("une règle sans condition reste une règle : elle s'applique toujours", () => {
  const vue = {
    modules: [{
      id: "m", titre: "Conduit mettant en communication des niveaux différents",
      statut: "conclu", valeur: "coffrage admis", exigence: true, conditions: [],
      pourquoi: { article: "47" }
    }]
  };

  const [regle] = reglesVersables(conclusionsVersables(vue), "");
  assert.equal(regle.sujet, "Conduit mettant en communication des niveaux différents");
  assert.deepEqual(regle.regle.conditions, []);
  assert.match(regle.provenance.quoi, /article 47/);
});

test("le classement part avec l'étude : sans lui, les règles renvoient à rien", () => {
  const [classement] = donneesDeBaseVersables(
    { faits: { classement: "3e famille B" }, texteDeReference: { source: "arrêté du 31 janvier 1986 modifié" } },
    "Escalier B"
  );

  assert.equal(classement.sujet, "Classement du bâtiment");
  assert.equal(classement.valeur, "3e famille B");
  // Une déclaration, pas une exigence : c'est le nom que les règles citent.
  assert.equal(classement.nature, "donnee-de-base");
  // Deux escaliers peuvent être classés différemment ; sans la portée, l'un
  // périmerait l'autre.
  assert.deepEqual(classement.zones, ["Escalier B"]);
});

test("hors champ n'est pas une famille, et n'entre donc pas en mémoire", () => {
  // « hors champ — IGH » dit que ce référentiel ne s'applique pas. Versé comme
  // une valeur, il se lirait comme un classement décidé.
  assert.deepEqual(donneesDeBaseVersables({ faits: { classement: "hors champ — IGH" } }, ""), []);
  assert.deepEqual(donneesDeBaseVersables({ faits: {} }, ""), []);
});
