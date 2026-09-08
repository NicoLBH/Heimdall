import test from "node:test";
import assert from "node:assert/strict";

import {
  chaineDuRaisonnement, valeurDuSujet, reglesQuiProduisent, traceDesLignes,
  grapheDuRaisonnement, dependancesDeLaMemoire
} from "./memoire-raisonnement.js";
import { blocDeRegle, OPERATEUR } from "./memoire-en-texte.js";

/** Une règle appliquée, telle que la mémoire la porte. */
const regle = (sujet, valeur, entrees = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: { conditions: entrees.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })), sauf: [] }
  }
});

/** Une valeur du projet, avec sa portée. */
const valeur = (sujet, dite, zones = null) => ({
  id: `a-${sujet}-${zones ?? "partout"}`, subject_key: sujet, status: "assumed", superseded_by: null,
  payload: { subject: sujet, value: dite, ...(zones ? { zones: [zones] } : {}) }
});

test("la chaîne remonte des données de base jusqu'au résultat", () => {
  // Colonne sèche ← Classement ← Hauteur. On lit ce dont une règle a besoin
  // avant elle, comme on lit l'arrêté avant la note de synthèse.
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    regle("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    valeur("Hauteur du plancher bas", "26 m"),
    valeur("Colonne sèche", "exigée")
  ];

  const { fonctions, entrees, manquants } = chaineDuRaisonnement("Colonne sèche", memoire);

  assert.deepEqual(fonctions.map((f) => f.payload.subject), ["Classement du bâtiment", "Colonne sèche"]);
  assert.deepEqual(entrees, ["Hauteur du plancher bas"]);
  assert.deepEqual(manquants, []);
});

test("ce sur quoi la chaîne s'appuie sans que personne l'ait versé se nomme", () => {
  // C'est le trou du raisonnement, et c'est la première chose qu'on veut voir
  // devant une valeur qu'on ne s'explique pas.
  const { entrees, manquants } = chaineDuRaisonnement("Colonne sèche", [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"])
  ]);

  assert.deepEqual(entrees, ["Classement du bâtiment"]);
  assert.deepEqual(manquants, ["Classement du bâtiment"]);
});

test("un cycle ne fige pas l'écran", () => {
  // Un référentiel mal versé doit se voir, pas bloquer.
  const { fonctions } = chaineDuRaisonnement("A", [regle("A", "1", ["B"]), regle("B", "2", ["A"])]);
  assert.deepEqual(fonctions.map((f) => f.payload.subject).sort(), ["A", "B"]);
});

test("une valeur se lit dans sa zone, jamais dans celle du voisin", () => {
  const memoire = [
    valeur("Degré coupe-feu", "CF 1 h"),
    valeur("Degré coupe-feu", "CF 1/2 h", "Bâtiment A")
  ];

  assert.equal(valeurDuSujet("Degré coupe-feu", memoire, "Bâtiment A").valeur, "CF 1/2 h");
  // Une zone sans valeur propre retombe sur ce qui vaut partout…
  assert.equal(valeurDuSujet("Degré coupe-feu", memoire, "Bâtiment B").valeur, "CF 1 h");
  // …et jamais sur celle d'une autre zone : sans valeur générale, on ne dit rien.
  assert.equal(valeurDuSujet("Degré coupe-feu", [memoire[1]], "Bâtiment B"), null);
});

test("une règle remplacée ne produit plus rien", () => {
  const perimee = { ...regle("Colonne sèche", "exigée"), superseded_by: "autre" };
  assert.equal(reglesQuiProduisent([perimee]).size, 0);
});

test("chaque ligne de code dit ce que son nom vaut aujourd'hui", () => {
  const lignes = blocDeRegle({
    sujet: "Colonne sèche",
    conditions: [{ sujet: "Classement du bâtiment", operateur: OPERATEUR.EGAL, valeur: "3e famille B" }],
    alors: "exigée"
  }).map((jetons) => ({ jetons }));

  const trace = traceDesLignes(lignes, {
    assertions: [valeur("Classement du bâtiment", "3e famille B")],
    zone: "Bâtiment A"
  });

  // La ligne de condition porte la valeur du nom qu'elle teste…
  const condition = trace.find((entree) => entree.sujet === "Classement du bâtiment");
  assert.equal(condition.valeur, "3e famille B");
  // …et ce que personne n'a versé se dit manquant plutôt que vide.
  const tete = trace.find((entree) => entree.sujet === "Colonne sèche");
  assert.equal(tete.manquant, true);
});

test("la zone se compare sur la clé, et le libellé d'origine se garde", () => {
  // La colonne de la base range « batiment-a », le `payload` garde « Bâtiment A ».
  // Comparer l'une à l'autre ne trouvait jamais rien : chaque valeur retombait
  // sur ce qui vaut partout, et l'écran disait « personne ne l'a versée » d'une
  // valeur que le projet portait.
  const memoire = [valeur("Degré coupe-feu", "CF 1/2 h", "Bâtiment A")];
  const dite = valeurDuSujet("Degré coupe-feu", memoire, "batiment-a");

  assert.equal(dite.valeur, "CF 1/2 h");
  assert.equal(dite.zone, "Bâtiment A");
});

test("une règle d'une autre zone n'explique pas celle qu'on lit", () => {
  // L'escalier A classé en 3ᵉ famille B et l'escalier B classé en 2ᵉ ne suivent
  // pas les mêmes articles : emprunter la règle du voisin se lirait comme la
  // sienne.
  const ailleurs = { ...regle("Colonne sèche", "exigée"), payload: {
    ...regle("Colonne sèche", "exigée").payload, zones: ["Bâtiment B"]
  } };

  assert.equal(reglesQuiProduisent([ailleurs], "batiment-a").size, 0);
  assert.equal(reglesQuiProduisent([ailleurs], "batiment-b").size, 1);
});

test("le schéma remonte jusqu'aux données de base, et chaque carte porte ses entrées", () => {
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    regle("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    valeur("Hauteur du plancher bas", "26 m"),
    valeur("Classement du bâtiment", "3e famille B"),
    valeur("Colonne sèche", "exigée")
  ];

  const { noeuds, liens } = grapheDuRaisonnement("Colonne sèche", memoire);

  // La première carte est ce qu'aucune règle ne produit : la donnée de base.
  assert.equal(noeuds[0].id, "donnee:hauteur du plancher bas");
  assert.equal(noeuds[0].valeur, "26 m");
  assert.deepEqual(noeuds[0].demande, []);

  // Et chaque étape porte ce qu'elle a lu, avec la valeur du jour.
  const classement = noeuds.find((noeud) => noeud.id === "regle:classement du batiment");
  assert.deepEqual(classement.entrees, [
    { nom: "Hauteur du plancher bas", valeur: "26 m", zone: "Toutes zones", manquant: false, deduite: false }
  ]);

  // Les liens vont de ce qui décide vers ce qui en découle.
  assert.deepEqual(liens.map((lien) => `${lien.de} → ${lien.vers}`), [
    "donnee:hauteur du plancher bas → regle:classement du batiment",
    "regle:classement du batiment → regle:colonne seche"
  ]);
});

test("une entrée que personne n'a versée se voit sur la carte", () => {
  // C'est le trou du raisonnement : le montrer vide se lirait comme une valeur
  // à zéro, et l'on chercherait l'erreur ailleurs.
  const { noeuds } = grapheDuRaisonnement("Colonne sèche", [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"])
  ]);

  const donnee = noeuds.find((noeud) => noeud.id === "donnee:classement du batiment");
  assert.equal(donnee.etat, "attente");
  assert.equal(donnee.valeur, "personne ne l'a versée");

  const seche = noeuds.find((noeud) => noeud.id === "regle:colonne seche");
  assert.equal(seche.entrees[0].manquant, true);
});

test("un maillon intermédiaire montre ce que sa règle a conclu", () => {
  // « Habitation individuelle ou collective » ne s'impose à personne : elle
  // n'entre ni dans les contraintes ni dans les données de base, et rien ne la
  // portait comme valeur. L'étape s'affichait sans résultat, et l'écran disait
  // « personne ne l'a versée » d'une valeur que le projet avait conclue.
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    regle("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    valeur("Hauteur du plancher bas", "26 m")
  ];

  const dite = valeurDuSujet("Classement du bâtiment", memoire);
  assert.equal(dite.valeur, "3e famille B");
  // Déduite, et non relevée : les confondre ferait prendre une conclusion pour
  // un constat de terrain.
  assert.equal(dite.deduite, true);

  const { noeuds } = grapheDuRaisonnement("Colonne sèche", memoire);
  const seche = noeuds.find((noeud) => noeud.id === "regle:colonne seche");
  assert.equal(seche.entrees[0].manquant, false);
  assert.equal(seche.entrees[0].valeur, "3e famille B");
});

test("les dépendances se déduisent des règles, au lieu de se déclarer", () => {
  // « si (Classement du bâtiment = …) » **est** un lien de dépendance, écrit une
  // fois, à l'endroit où il compte. Le redemander dans un formulaire, c'était
  // demander d'écrire deux fois la même chose — et personne ne le faisait.
  const hauteur = valeur("Hauteur du plancher bas", "26 m");
  const classement = valeur("Classement du bâtiment", "3e famille B");
  const seche = valeur("Colonne sèche", "exigée");

  const liens = dependancesDeLaMemoire([
    regle("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    regle("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    hauteur, classement, seche
  ]);

  const dits = liens.map((lien) => `${lien.assertion_id} <- ${lien.depends_on_assertion_id}`).sort();
  assert.deepEqual(dits, [
    `${classement.id} <- ${hauteur.id}`,
    `${seche.id} <- ${classement.id}`
  ].sort());
});

test("une dépendance ne traverse pas les zones", () => {
  // Le degré du bâtiment A ne dépend pas de la hauteur du bâtiment B : les
  // relier ferait revérifier l'un quand l'autre bouge, et le signal deviendrait
  // du bruit qu'on apprend à ignorer.
  const ici = valeur("Hauteur du plancher bas", "26 m", "Bâtiment A");
  const ailleurs = valeur("Hauteur du plancher bas", "31 m", "Bâtiment B");
  const produite = valeur("Classement du bâtiment", "3e famille B", "Bâtiment A");

  const liens = dependancesDeLaMemoire([
    regle("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    ici, ailleurs, produite
  ]);

  assert.deepEqual(liens.map((lien) => lien.depends_on_assertion_id), [ici.id]);
});
