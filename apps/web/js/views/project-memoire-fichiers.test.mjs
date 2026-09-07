import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDeLAssertion, provenanceDeLAssertion, statutDeLAssertion,
  jetonsDeLAssertion, octets, ilYA
} from "./project-memoire-fichiers.js";
import { enClair, texteDesLignes, PROVENANCE, STATUT } from "../services/memoire-en-texte.js";
import { lireUnFichier } from "../services/memoire-en-lecture.js";

const clair = (ligne) => enClair(ligne.jetons);
const enTexte = (assertion) => texteDesLignes(lignesDeLAssertion(assertion).map((ligne) => ligne.jetons));

test("une valeur mesurée s'écrit nue, avec sa provenance dessous", () => {
  const lignes = lignesDeLAssertion({
    nature: "donnee-de-base",
    payload: { subject: "Altitude du site", value: "490,03 m", source: "Zonages réglementaires" }
  });

  assert.deepEqual(lignes.map(clair), [
    "Altitude du site = 490,03 m {",
    "   document: Zonages réglementaires",
    "   statut: retenu",
    "}"
  ]);
  assert.equal(lignes[0].nature, "affirmation");
  assert.equal(lignes[1].nature, "detail");
});

test("le type de la provenance est l'origine : rien de plus à déclarer", () => {
  // Un calcul l'emporte : une valeur calculée se refait en refaisant le calcul.
  assert.deepEqual(
    provenanceDeLAssertion({ payload: { deduitDe: { calcul: "hors gel", entrees: [{ sujet: "altitude", valeur: "490 m" }] } } }),
    { type: PROVENANCE.CALCUL, quoi: "hors gel (altitude = 490 m)" }
  );
  // Une contrainte sort d'un texte appliqué…
  assert.deepEqual(
    provenanceDeLAssertion({ nature: "contrainte", payload: { source: "arrêté du 31 janvier 1986", article: "article 6" } }),
    { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986, article 6" }
  );
  // …une donnée de base est relevée dans une pièce du projet.
  assert.equal(provenanceDeLAssertion({ nature: "donnee-de-base", payload: { source: "plan R+3" } }).type, PROVENANCE.DOCUMENT);
  // Ce que l'utilitaire a déclaré l'emporte sur tout le reste.
  assert.deepEqual(
    provenanceDeLAssertion({ nature: "contrainte", payload: { provenance: { type: "règle", quoi: "Colonne sèche" }, source: "arrêté" } }),
    { type: PROVENANCE.REGLE, quoi: "Colonne sèche" }
  );
  assert.equal(provenanceDeLAssertion({ payload: {} }), null);
});

test("le statut se lit sur ce que la mémoire sait déjà, faute d'être déclaré", () => {
  assert.equal(statutDeLAssertion({ payload: { statut: STATUT.CONTESTE } }), STATUT.CONTESTE);
  assert.equal(statutDeLAssertion({ status: "rejected" }), STATUT.ECARTE);
  assert.equal(statutDeLAssertion({ superseded_by: "a-1" }), STATUT.REMPLACE);
  assert.equal(statutDeLAssertion({ nature: "hypothese" }), STATUT.SUPPOSE);
  assert.equal(statutDeLAssertion({ nature: "contrainte" }), STATUT.RETENU);
});

test("une hypothèse se dit supposée, et sa provenance dit qui doit la confirmer", () => {
  const texte = enTexte({
    nature: "hypothese",
    payload: {
      subject: "Portance du sol", value: "0,2 MPa",
      provenance: { type: PROVENANCE.HYPOTHESE, quoi: "à confirmer par le G2" }
    }
  });

  assert.equal(texte, [
    "Portance du sol = 0,2 MPa {",
    "   hypothèse: à confirmer par le G2",
    "   statut: supposé",
    "}"
  ].join("\n"));
});

test("la mémoire ne recopie plus la règle, et n'écrit plus de dépendances", () => {
  const texte = enTexte({
    nature: "contrainte",
    payload: {
      subject: "Colonne sèche", value: "exigée",
      provenance: { type: PROVENANCE.REGLE, quoi: "Colonne sèche — arrêté du 31 janvier 1986, article 98" },
      citation: "Les habitations de la 3ème famille B doivent comporter une colonne sèche."
    }
  });

  assert.equal(texte.includes("si "), false);
  assert.equal(texte.includes("dépend de"), false);
  assert.match(texte, /parce que: "Les habitations de la 3ème famille B/);
});

test("ce que la mémoire écrit se relit sans perte", () => {
  const assertion = {
    nature: "contrainte",
    payload: {
      subject: "Degré coupe-feu des planchers", value: "CF 1 h",
      provenance: { type: PROVENANCE.REGLE, quoi: "Degré coupe-feu des planchers — article 6" },
      citation: "habitations de la 3ème famille : 1 heure ;",
      statut: STATUT.RETENU
    }
  };

  const { blocs, refus } = lireUnFichier(enTexte(assertion));
  assert.deepEqual(refus, []);
  assert.equal(blocs.length, 1);
  assert.equal(blocs[0].sujet, "Degré coupe-feu des planchers");
  assert.equal(blocs[0].valeur, "CF 1 h");
  assert.deepEqual(blocs[0].provenance, assertion.payload.provenance);
  assert.equal(blocs[0].preuve, assertion.payload.citation);
  assert.equal(blocs[0].statut, STATUT.RETENU);
});

test("jetonsDeLAssertion rend la ligne de valeur, pas son détail", () => {
  const jetons = jetonsDeLAssertion({
    payload: { subject: "Zone de vent", value: "2", provenance: { type: PROVENANCE.DOCUMENT, quoi: "carte" } }
  });
  // Sans accolade : elle borne un bloc, et il n'y a pas de bloc hors contexte.
  assert.equal(enClair(jetons), "Zone de vent = 2");
});

test("le poids d'un fichier se dit en octets, accents compris", () => {
  assert.equal(octets("abc"), "3 octets");
  assert.equal(octets("é"), "2 octets");
  assert.match(octets("x".repeat(2048)), /^2\.0 Ko$/);
});

test("une date se lit en durée, pas en calendrier", () => {
  const jours = (n) => new Date(Date.now() - n * 86400000).toISOString();
  assert.equal(ilYA(jours(0)), "aujourd'hui");
  assert.equal(ilYA(jours(1)), "hier");
  assert.equal(ilYA(jours(10)), "il y a 10 jours");
  assert.equal(ilYA(jours(150)), "il y a 5 mois");
  assert.equal(ilYA("n'importe quoi"), "date inconnue");
});

test("une règle appliquée s'écrit comme une règle, pas comme un fait du projet", () => {
  const texte = enTexte({
    domain: "incendie",
    payload: {
      subject: "Classement du bâtiment", value: "3e famille B", referentiel: true,
      regle: {
        conditions: [
          { sujet: "Logements superposés", operateur: "=", valeur: ["oui"], unite: "", logique: true },
          { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: "<=", valeur: ["28"], unite: "m", joint: "et" }
        ],
        sinon: "3e famille A",
        sauf: []
      },
      provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 3, 3°)" },
      citation: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."
    }
  });

  assert.equal(texte, [
    "Classement du bâtiment (Logements superposés, Hauteur du plancher bas du logement le plus haut) {",
    "   si Logements superposés = oui",
    "   et Hauteur du plancher bas du logement le plus haut <= 28 m",
    '   alors "3e famille B"',
    '   sinon "3e famille A"',
    "   texte: arrêté du 31 janvier 1986 modifié, article 3, 3°)",
    '      parce que: "Troisième famille B : habitations ne satisfaisant pas à l\'une des conditions précédentes."',
    "}"
  ].join("\n"));

  // Pas de `=` sur la tête : la règle ne dit pas ce que vaut la donnée ici.
  assert.equal(texte.split("\n")[0].includes(" = "), false);
  // Et pas de statut : un référentiel n'a pas d'état dans un projet.
  assert.equal(texte.includes("statut"), false);
});

test("ce que la mémoire écrit d'une règle se relit sans perte", () => {
  const assertion = {
    domain: "incendie",
    payload: {
      subject: "Colonne sèche", value: "exigée", referentiel: true,
      regle: {
        conditions: [{ sujet: "Classement du bâtiment", operateur: "parmi", valeur: ["3e famille B", "4e famille"], unite: "", logique: false }],
        sinon: "", sauf: []
      },
      provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 98" }
    }
  };

  const { blocs, refus } = lireUnFichier(enTexte(assertion));
  assert.deepEqual(refus, []);
  assert.equal(blocs[0].sujet, "Colonne sèche");
  assert.equal(blocs[0].valeur, "");
  assert.equal(blocs[0].alors, "exigée");
  assert.deepEqual(blocs[0].conditions[0].valeur, ["3e famille B", "4e famille"]);
});
