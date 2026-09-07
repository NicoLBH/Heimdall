import test from "node:test";
import assert from "node:assert/strict";

import {
  blocDeRegle, blocDAffirmation, enTeteDeFichier, texteDesLignes,
  PROVENANCE, STATUT, OPERATEUR
} from "./memoire-en-texte.js";
import {
  lireUnFichier, lireUneCondition, lireUneValeur, lireUneTete,
  dependancesDuBloc, grapheDesBlocs, aRevoirSi
} from "./memoire-en-lecture.js";

/** Ce que le référentiel incendie porte, en petit. */
const REGLES = [
  {
    sujet: "Classement du bâtiment",
    conditions: [
      { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: ["oui"], unite: "", logique: true },
      { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: OPERATEUR.AU_PLUS, valeur: ["28"], unite: "m", logique: false, joint: "et" },
      { sujet: "Voie-échelles", operateur: OPERATEUR.PARMI, valeur: ["non conforme", "non décrite"], unite: "", logique: false, joint: "et" }
    ],
    alors: "3e famille B",
    sinon: "",
    sauf: [],
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 3, 3°)" },
    preuve: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."
  },
  {
    sujet: "Colonne sèche",
    conditions: [
      { sujet: "Classement du bâtiment", operateur: OPERATEUR.PARMI, valeur: ["3e famille B", "4e famille"], unite: "", logique: false }
    ],
    alors: "exigée, une colonne sèche de 65 mm par escalier",
    sinon: "",
    sauf: [],
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 98, premier alinéa" },
    preuve: "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier."
  }
];

/** Un bloc relu, ramené à la forme d'un bloc écrit — pour les comparer. */
const commeEcrit = (bloc) => ({
  sujet: bloc.sujet,
  conditions: bloc.conditions,
  alors: bloc.alors,
  sinon: bloc.sinon,
  sauf: bloc.sauf,
  provenance: bloc.provenance,
  preuve: bloc.preuve
});

test("lire(écrire(G)) = G — une règle traverse le texte sans rien perdre", () => {
  const texte = texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle)));
  const { blocs, refus } = lireUnFichier(texte);

  assert.deepEqual(refus, []);
  assert.equal(blocs.length, REGLES.length);
  assert.deepEqual(blocs.map(commeEcrit), REGLES);
});

test("lire(écrire(G)) = G — une affirmation de projet aussi", () => {
  const affirmations = [
    { sujet: "Classement du bâtiment", valeur: "3e famille B", unite: "", zones: [],
      provenance: { type: PROVENANCE.REGLE, quoi: "Classement du bâtiment, article 3, 3°)" },
      preuve: "", statut: STATUT.RETENU },
    { sujet: "Hauteur du plancher bas du logement le plus haut", valeur: "26", unite: "m", zones: ["bâtiment A"],
      provenance: { type: PROVENANCE.DOCUMENT, quoi: "plan de coupe AA, indice C" },
      preuve: "niveau +26,00 au plancher du R+8", statut: "" },
    { sujet: "Portance du sol", valeur: "0,2", unite: "MPa", zones: [],
      provenance: { type: PROVENANCE.HYPOTHESE, quoi: "à confirmer par le G2" },
      preuve: "", statut: STATUT.SUPPOSE }
  ];

  const texte = texteDesLignes(affirmations.flatMap((affirmation) => blocDAffirmation(affirmation)));
  const { blocs, refus } = lireUnFichier(texte);

  assert.deepEqual(refus, []);
  assert.deepEqual(
    blocs.map((bloc) => ({
      sujet: bloc.sujet, valeur: bloc.valeur, unite: bloc.unite, zones: bloc.zones,
      provenance: bloc.provenance, preuve: bloc.preuve, statut: bloc.statut
    })),
    affirmations
  );
});

test("l'en-tête ne produit aucun bloc, et le chemin se lit", () => {
  const texte = texteDesLignes([
    ...enTeteDeFichier({ chemin: ["Contraintes", "Incendie"], produitPar: "un utilitaire", le: "6 septembre 2026" }),
    ...blocDAffirmation({ sujet: "Colonne sèche", valeur: "exigée", statut: STATUT.RETENU })
  ]);

  const { chemin, blocs, refus } = lireUnFichier(texte);
  assert.equal(chemin, "contraintes/incendie.mdall");
  assert.equal(blocs.length, 1);
  assert.deepEqual(refus, []);
});

test("« ou » dans un sujet n'est pas une disjonction", () => {
  const condition = lireUneCondition('Habitation individuelle ou collective = "collective"');
  assert.equal(condition.sujet, "Habitation individuelle ou collective");
  assert.deepEqual(condition.valeur, ["collective"]);
});

test("une mesure se lit nue, un texte entre guillemets", () => {
  assert.deepEqual(lireUneValeur("26 m"), { valeur: "26", unite: "m", citee: false });
  assert.deepEqual(lireUneValeur('"3e famille B"'), { valeur: "3e famille B", unite: "", citee: true });
  assert.deepEqual(lireUneValeur("« 3e famille B »"), { valeur: "3e famille B", unite: "", citee: true });
});

test("un architecte peut taper <= et des guillemets droits", () => {
  const aLaMain = lireUneCondition('Hauteur du plancher bas <= 28 m');
  assert.equal(aLaMain.operateur, OPERATEUR.AU_PLUS);
  assert.deepEqual(aLaMain.valeur, ["28"]);
  assert.equal(aLaMain.unite, "m");
});

test("la portée se lit derrière l'arobase", () => {
  const tete = lireUneTete('Degré coupe-feu des planchers = "CF 1 h" @ bâtiment A, bâtiment B');
  assert.equal(tete.sujet, "Degré coupe-feu des planchers");
  assert.equal(tete.valeur, "CF 1 h");
  assert.deepEqual(tete.zones, ["bâtiment A", "bâtiment B"]);
});

test("ce qui ne se comprend pas se dit, avec son numéro de ligne", () => {
  const { blocs, refus } = lireUnFichier([
    'Classement du bâtiment = "3e famille B"',
    "   ← oracle une boule de cristal",
    "   statut peut-être",
    "   pourquoi pas",
    "   dépend de Famille"
  ].join("\n"));

  assert.equal(blocs.length, 1);
  assert.deepEqual(refus.map((r) => r.ligne), [2, 3, 4, 5]);
  assert.match(refus[0].raison, /n'est pas une provenance connue/);
  assert.match(refus[1].raison, /n'est pas un statut connu/);
  assert.match(refus[3].raison, /aucun mot de la langue/);
});

test("les dépendances se déduisent des conditions, elles ne s'écrivent pas", () => {
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));

  assert.deepEqual(dependancesDuBloc(blocs[0]), [
    "Logements superposés",
    "Hauteur du plancher bas du logement le plus haut",
    "Voie-échelles"
  ]);
  assert.deepEqual(dependancesDuBloc(blocs[1]), ["Classement du bâtiment"]);
});

test("le graphe se reconstruit depuis le texte, entrées comprises", () => {
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));
  const { produits, entrees } = grapheDesBlocs(blocs);

  assert.deepEqual(produits, ["Classement du bâtiment", "Colonne sèche"]);
  assert.deepEqual(entrees, [
    "Hauteur du plancher bas du logement le plus haut",
    "Logements superposés",
    "Voie-échelles"
  ]);
});

test("changer une hauteur dit ce qu'il faut revérifier", () => {
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));

  assert.deepEqual(
    aRevoirSi("Hauteur du plancher bas du logement le plus haut", blocs),
    ["Classement du bâtiment", "Colonne sèche"]
  );
  assert.deepEqual(aRevoirSi("Colonne sèche", blocs), []);
});

test("un corpus circulaire ne fait pas boucler la lecture", () => {
  const blocs = [
    { sujet: "A", conditions: [{ sujet: "B" }], sauf: [] },
    { sujet: "B", conditions: [{ sujet: "A" }], sauf: [] }
  ];
  assert.deepEqual(aRevoirSi("A", blocs), ["B"]);
});
