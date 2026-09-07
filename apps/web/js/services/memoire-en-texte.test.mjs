import test from "node:test";
import assert from "node:assert/strict";

import {
  ECRITURE, JETON, MOTS, RETRAIT, OPERATEUR, PROVENANCE, STATUT,
  ligneDAffirmation, ligneDeDonnee, ligneDeCondition, ligneDeConsequence,
  ligneDeProvenance, ligneDePreuve, ligneDeStatut, ligneDeDate,
  blocDeRegle, blocDAffirmation,
  enTeteDeFichier, nomDeFichier, cheminDeFichier, enClair, texteDesLignes,
  natureDeLaLigne, couperLUnite, estMesuree
} from "./memoire-en-texte.js";

const clair = (jetons) => enClair(jetons);

test("une mesure s'écrit nue, un texte entre guillemets", () => {
  assert.equal(clair(ligneDAffirmation({ sujet: "Altitude du site", valeur: "490,03", unite: "m" })),
    "Altitude du site = 490,03 m");
  assert.equal(clair(ligneDAffirmation({ sujet: "Classement du bâtiment", valeur: "3e famille B" })),
    'Classement du bâtiment = "3e famille B"');
  // « CF 1/2 h » n'est pas une mesure : c'est un degré, et le couper produirait
  // « CF » suivi de « 1/2 h ».
  assert.equal(clair(ligneDAffirmation({ sujet: "Planchers", valeur: "CF 1/2 h" })),
    'Planchers = "CF 1/2 h"');
});

test("estMesuree distingue une cote d'une catégorie", () => {
  assert.equal(estMesuree("26 m"), true);
  assert.equal(estMesuree("490,03"), true);
  assert.equal(estMesuree("3e famille B"), false);
  assert.equal(estMesuree("CF 1 h"), false);
  assert.deepEqual(couperLUnite("490,03 m"), { nombre: "490,03", unite: "m" });
});

test("la portée n'est plus sur la ligne : c'est le dossier qui la porte", () => {
  assert.equal(
    clair(ligneDAffirmation({ sujet: "Degré coupe-feu", valeur: "CF 1 h" })),
    'Degré coupe-feu = "CF 1 h"'
  );
  // Une règle porte ses entrées, qui se calculent depuis ses conditions.
  assert.equal(
    clair(ligneDeDonnee("Classement du bâtiment", ["Logements superposés", "Hauteur"])),
    "Classement du bâtiment (Logements superposés, Hauteur)"
  );
  // Deux fois la même entrée ne s'écrit qu'une fois.
  assert.equal(clair(ligneDeDonnee("X", ["A", "A", ""])), "X (A)");
});

test("une condition porte son opérateur et son unité", () => {
  assert.equal(
    clair(ligneDeCondition("si", { sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" })),
    `${RETRAIT}si Hauteur du plancher bas <= 28 m`
  );
  assert.equal(
    clair(ligneDeCondition("et", { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true })),
    `${RETRAIT}et Logements superposés = oui`
  );
  assert.equal(
    clair(ligneDeCondition("si", { sujet: "Voie-engins", operateur: OPERATEUR.PARMI, valeur: ["non conforme", "non décrite"] })),
    `${RETRAIT}si Voie-engins parmi "non conforme" ou "non décrite"`
  );
});

test("« renseigné » ne compare rien : il ferme la ligne", () => {
  assert.equal(
    clair(ligneDeCondition("si", { sujet: "Classement du bâtiment", operateur: OPERATEUR.RENSEIGNE })),
    `${RETRAIT}si Classement du bâtiment renseigné`
  );
});

test("une provenance dit son type, et le type est l'origine", () => {
  assert.equal(clair(ligneDeProvenance({ type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986, article 6" })),
    `${RETRAIT}texte: arrêté du 31 janvier 1986, article 6`);
  assert.equal(clair(ligneDeProvenance({ type: PROVENANCE.HYPOTHESE, quoi: "à confirmer par le G2" })),
    `${RETRAIT}hypothèse: à confirmer par le G2`);
  // Ce qui manque n'apparaît pas, plutôt que d'apparaître creux.
  assert.equal(ligneDeProvenance({ type: PROVENANCE.TEXTE, quoi: "" }), null);
});

test("la preuve s'indente sous la provenance qu'elle appuie", () => {
  assert.equal(clair(ligneDePreuve("Les planchers sont coupe-feu de degré une heure.")),
    `${RETRAIT}${RETRAIT}parce que: "Les planchers sont coupe-feu de degré une heure."`);
  // Les guillemets d'origine ne se doublent pas.
  assert.equal(clair(ligneDePreuve("« déjà cité »")), `${RETRAIT}${RETRAIT}parce que: "déjà cité"`);
  assert.equal(ligneDePreuve(""), null);
});

test("le statut est l'état du raisonnement dans ce projet, pas une propriété de la valeur", () => {
  assert.equal(clair(ligneDeStatut(STATUT.SUPPOSE)), `${RETRAIT}statut: supposé`);
  assert.equal(clair(ligneDeStatut(STATUT.SANS_OBJET)), `${RETRAIT}statut: sans objet`);
  assert.equal(ligneDeStatut(""), null);
});

test("une règle ne porte aucune valeur de projet", () => {
  const lignes = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [
      { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true },
      { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }
    ],
    alors: "3e famille B",
    sinon: "3e famille A",
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 3, 3°)" },
    preuve: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."
  });

  assert.deepEqual(lignes.map(clair), [
    "Classement du bâtiment (Logements superposés, Hauteur du plancher bas du logement le plus haut) {",
    `${RETRAIT}si Logements superposés = oui`,
    `${RETRAIT}et Hauteur du plancher bas du logement le plus haut <= 28 m`,
    `${RETRAIT}alors "3e famille B"`,
    `${RETRAIT}sinon "3e famille A"`,
    `${RETRAIT}texte: arrêté du 31 janvier 1986 modifié, article 3, 3°)`,
    `${RETRAIT}${RETRAIT}parce que: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."`,
    "}"
  ]);

  // Aucune valeur de projet, et surtout aucun « ✓ retenu » : la branche prise
  // est un fait de projet, pas une propriété de la règle.
  assert.equal(texteDesLignes(lignes).includes("retenu"), false);
  assert.equal(texteDesLignes(lignes).includes("dépend de"), false);
});

test("une affirmation de projet ne recopie pas la règle", () => {
  const lignes = blocDAffirmation({
    sujet: "Colonne sèche",
    valeur: "exigée, une colonne sèche de 65 mm par escalier",
    provenance: { type: PROVENANCE.REGLE, quoi: "Colonne sèche — arrêté du 31 janvier 1986, article 98" },
    statut: STATUT.RETENU
  });

  assert.deepEqual(lignes.map(clair), [
    'Colonne sèche = "exigée, une colonne sèche de 65 mm par escalier" {',
    `${RETRAIT}règle: Colonne sèche — arrêté du 31 janvier 1986, article 98`,
    `${RETRAIT}statut: retenu`,
    "}"
  ]);

  // Une affirmation qui ne porte rien d'autre que sa valeur ne s'entoure pas
  // d'accolades : une paire de bornes autour de rien serait du bruit.
  assert.deepEqual(blocDAffirmation({ sujet: "Zone de neige", valeur: "E" }).map(clair),
    ['Zone de neige = "E"']);
  assert.equal(texteDesLignes(lignes).includes("si "), false);
});

test("une exception se lit sous la règle, dans les mots du texte", () => {
  const lignes = blocDeRegle({
    sujet: "Escalier protégé",
    conditions: [{ sujet: "Hauteur du dernier plancher", operateur: OPERATEUR.PLUS_DE, valeur: "8", unite: "m" }],
    alors: "exigé",
    sauf: [{ sujet: "Unités de passage", operateur: OPERATEUR.EGAL, valeur: "1" }]
  });

  assert.equal(clair(lignes[3]), `${RETRAIT}sauf si Unités de passage = 1`);
});

test("l'en-tête porte la version de l'écriture, pas seulement la date", () => {
  const lignes = enTeteDeFichier({
    chemin: ["Escalier B", "Incendie"], extension: "ctr",
    produitPar: "un utilitaire", le: "7 septembre 2026"
  });
  assert.deepEqual(lignes.map(clair), [
    "fichier: escalier-b/incendie.ctr",
    "note: établi par un utilitaire, le 7 septembre 2026",
    `note: écriture Mdall v${ECRITURE}`
  ]);
});

test("l'extension dit ce que le fichier contient, le chemin où il vit", () => {
  assert.equal(nomDeFichier(["Escalier B", "Structure"], "ddb"), "structure.ddb");
  assert.equal(cheminDeFichier(["Escalier B", "Incendie"], "ctr"), "escalier-b/incendie.ctr");
  assert.equal(cheminDeFichier(["Escalier B", "Incendie"], "ref"), "escalier-b/incendie.ref");
  assert.equal(cheminDeFichier(["Tout l'ouvrage", "Incendie — Habitation"], "ref"), "tout-l-ouvrage/incendie-habitation.ref");
});

test("aucun mot du langage n'est emprunté à un langage de programmation", () => {
  const interdits = ["const", "function", "return", "if", "else", "true", "false", "null", "//", "=>", "{", "}"];
  for (const mot of MOTS) {
    assert.equal(interdits.includes(mot), false, `« ${mot} » vient de la programmation`);
  }
  // « sauf si » avant « si » : sans cet ordre, « sauf si » se lirait comme
  // « sauf » suivi d'un sujet nommé « si ».
  assert.ok(MOTS.indexOf("sauf si") < MOTS.indexOf("si"));
});

test("la nature d'une ligne se lit à sa marque, numéros de colonne compris", () => {
  assert.equal(natureDeLaLigne("fichier: escalier-b/incendie.ctr"), "section");
  assert.equal(natureDeLaLigne("note: écriture Mdall v4.0"), "note");
  assert.equal(natureDeLaLigne("  12  - Zone de neige"), "retire");
  assert.equal(natureDeLaLigne("  12  + Zone de neige"), "ajoute");
  assert.equal(natureDeLaLigne("Zone de neige = \"E\""), "contexte");
});

test("chaque jeton porte un type que la feuille de style sait colorer", () => {
  const types = new Set(Object.values(JETON));
  const lignes = [
    ...blocDeRegle({
      sujet: "Classement du bâtiment",
      conditions: [{ sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
      alors: "3e famille B",
      sauf: [{ sujet: "Dérogation", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true }],
      provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté, article 3" },
      preuve: "citation"
    }),
    ...blocDAffirmation({ sujet: "Colonne sèche", valeur: "exigée", le: "12 mars 2026", statut: STATUT.RETENU }),
    ...enTeteDeFichier({ chemin: ["Escalier B", "Incendie"], extension: "ctr" }),
    ligneDeDonnee("Une donnée"),
    ligneDeConsequence("alors", "12", "m")
  ];

  for (const ligne of lignes) {
    for (const jeton of ligne) {
      assert.ok(types.has(jeton.type), `type inconnu : ${jeton.type}`);
    }
  }
});
