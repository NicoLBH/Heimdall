import test from "node:test";
import assert from "node:assert/strict";

import {
  cleDuSujet, sujetsDeclares, roleDesJetons, resolutionDuSujet,
  renvoisSansDeclaration, variablesDeLaMemoire, ROLE, RESOLUTION
} from "./memoire-identifiants.js";
import { blocDeRegle, blocDAffirmation, OPERATEUR, PROVENANCE } from "./memoire-en-texte.js";

const assertion = (sujet, extra = {}) => ({
  id: `a-${sujet}`, subject_key: sujet, status: "assumed", superseded_by: null,
  payload: { subject: sujet, value: "x" }, ...extra
});

test("deux écritures du même nom se rejoignent, sans deviner plus loin", () => {
  assert.equal(cleDuSujet("Hauteur du plancher  bas"), cleDuSujet("hauteur du plancher bas"));
  assert.equal(cleDuSujet("Élévation"), cleDuSujet("elevation"));
  // Pas de rapprochement au-delà : « hauteur » et « hauteurs » sont deux noms,
  // et les confondre ferait passer pour résolu un renvoi qui ne l'est pas.
  assert.notEqual(cleDuSujet("hauteur"), cleDuSujet("hauteurs"));
});

test("ce qui a été remplacé ne déclare plus rien", () => {
  const declares = sujetsDeclares([
    assertion("Hauteur du plancher bas"),
    assertion("Zone de neige", { superseded_by: "a-2" })
  ]);

  assert.equal(declares.has(cleDuSujet("Hauteur du plancher bas")), true);
  // Un renvoi vers elle renverrait vers ce que le projet ne tient plus pour vrai.
  assert.equal(declares.has(cleDuSujet("Zone de neige")), false);
});

test("c'est le premier mot qui dit si un nom se pose ou s'il renvoie", () => {
  const [tete, condition] = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [{ sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
    alors: "3e famille B"
  });

  assert.equal(roleDesJetons(tete), ROLE.DECLARATION);
  assert.equal(roleDesJetons(condition), ROLE.RENVOI);
});

test("une déclaration ne se résout pas : elle est la résolution", () => {
  const [tete] = blocDAffirmation({ sujet: "Zone de neige", valeur: "A2" });
  assert.equal(
    resolutionDuSujet("Zone de neige", { jetons: tete, declares: new Set() }),
    RESOLUTION.DECLARATION
  );
});

test("un renvoi se cherche, et son absence se dit", () => {
  const [, condition] = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [{ sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
    alors: "3e famille B"
  });

  const connus = sujetsDeclares([assertion("Hauteur du plancher bas")]);
  assert.equal(resolutionDuSujet("Hauteur du plancher bas", { jetons: condition, declares: connus }), RESOLUTION.CONNU);
  assert.equal(resolutionDuSujet("Hauteur du plancher bas", { jetons: condition, declares: new Set() }), RESOLUTION.INCONNU);

  // Sans table, on ne dit rien : un fichier rouge de bout en bout n'apprend
  // rien à personne.
  assert.equal(resolutionDuSujet("Hauteur du plancher bas", { jetons: condition }), "");
});

test("un fichier dit ce sur quoi il s'appuie sans que personne l'ait versé", () => {
  const lignes = blocDeRegle({
    sujet: "Colonne sèche",
    conditions: [
      { sujet: "Classement du bâtiment", operateur: OPERATEUR.EGAL, valeur: "3e famille B" },
      { sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m", joint: "et" }
    ],
    alors: "exigée",
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté, article 98" }
  });

  const manquants = renvoisSansDeclaration(lignes, sujetsDeclares([assertion("Classement du bâtiment")]));
  assert.deepEqual(manquants, ["Hauteur du plancher bas"]);

  // Le sujet de la règle elle-même n'est pas un renvoi : il se pose.
  assert.equal(manquants.includes("Colonne sèche"), false);
});

test("les variables du projet se voient toutes, et avec elles qui s'en sert", () => {
  const declaration = blocDAffirmation({ sujet: "Hauteur du plancher bas", valeur: "26", unite: "m" });
  const regle = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [
      { sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" },
      { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true, joint: "et" }
    ],
    alors: "3e famille B"
  });

  const variables = variablesDeLaMemoire(
    [
      { fichier: "memoire/donnees-de-base.ddb", lignes: declaration },
      { fichier: "memoire/incendie.ref", lignes: regle }
    ],
    (f) => f.lignes.map((jetons) => ({ jetons }))
  );

  const parNom = new Map(variables.map((v) => [v.nom, v]));

  const hauteur = parNom.get("Hauteur du plancher bas");
  assert.equal(hauteur.declaree, true);
  assert.equal(hauteur.declarePar, "memoire/donnees-de-base.ddb");
  assert.equal(hauteur.valeur, "26 m");
  assert.deepEqual(hauteur.citeePar, ["memoire/incendie.ref"]);

  // La règle se déclare : elle produit un nom, elle n'en emprunte pas un. Et ce
  // qu'elle pose se lit sur sa ligne `alors` — sa tête ne dit pas ce qu'elle vaut.
  assert.equal(parNom.get("Classement du bâtiment").declaree, true);
  assert.equal(parNom.get("Classement du bâtiment").valeur, '"3e famille B"');

  // Et ce que personne n'a versé figure aussi : c'est le trou du raisonnement,
  // et le taire ne montrerait que ce qui va bien.
  const manquante = parNom.get("Logements superposés");
  assert.equal(manquante.declaree, false);
  assert.deepEqual(manquante.citeePar, ["memoire/incendie.ref"]);
});
