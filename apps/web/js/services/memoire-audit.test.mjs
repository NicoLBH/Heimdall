import test from "node:test";
import assert from "node:assert/strict";

import { VERDICT, auditerLaMemoire, cequiAppelleUnGeste } from "./memoire-audit.js";
import { OPERATEUR } from "./memoire-en-texte.js";

const regle = (sujet, alors, conditions, { zones = null, sinon = "" } = {}) => ({
  id: `r-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null, zones,
  payload: {
    subject: sujet, value: alors, referentiel: true, ...(zones ? { zones } : {}),
    regle: { conditions, sinon, sauf: [] }
  }
});

const dit = (sujet, valeur, { zones = null } = {}) => ({
  id: `a-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  subject_key: sujet, status: "assumed", superseded_by: null, zones,
  payload: { subject: sujet, value: valeur, ...(zones ? { zones } : {}) }
});

const deduite = (sujet, valeur, utilitaire) => ({
  id: `a-${sujet}`, subject_key: `site:${sujet}`, status: "assumed", superseded_by: null,
  payload: { subject: sujet, value: valeur, derived: true, utilitaire }
});

const egal = (sujet, valeur) => ({ sujet, operateur: OPERATEUR.EGAL, valeur });
const auPlus = (sujet, seuil, unite) => ({ sujet, operateur: OPERATEUR.AU_PLUS, valeur: seuil, unite });

/** Une mémoire qui tient : la hauteur, le classement qu'elle donne, le degré. */
const saine = [
  dit("Hauteur", "26 m"),
  regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
  dit("Classement", "3e famille B"),
  regle("Degré CF", "CF 1 h", [egal("Classement", "3e famille B")], { sinon: "CF 1 h 1/2" }),
  dit("Degré CF", "CF 1 h")
];

test("une mémoire qui tient le dit, et le dit aussi fort que l'inverse", () => {
  const audit = auditerLaMemoire(saine);

  assert.equal(audit.tient, true);
  assert.equal(audit.compte.identiques, 2);
  assert.equal(audit.compte.differentes, 0);
  assert.deepEqual(cequiAppelleUnGeste(audit), []);
});

test("une valeur qui a dérivé se dénonce, avec ce que la règle conclut", () => {
  // La hauteur a été corrigée sans que l'aval suive : ce que le projet affirme
  // n'est plus ce que sa propre règle conclut.
  const memoire = [dit("Hauteur", "31 m"), ...saine.slice(1)];
  const audit = auditerLaMemoire(memoire);

  assert.equal(audit.tient, false);
  const derive = audit.verdicts.find((l) => l.verdict === VERDICT.DIFFERENTE);
  assert.equal(derive.sujet, "Classement");
  assert.equal(derive.affirmee, "3e famille B");
  assert.equal(derive.conclue, "4e famille");
  // Et la trace dit sur quoi le verdict repose.
  assert.deepEqual(derive.trace.map((c) => [c.sujet, c.lu, c.verite]), [["Hauteur", "31 m", false]]);
});

test("l'audit est local : il ne compte pas deux fois une même dérive", () => {
  // C'est le choix qui rend l'audit lisible. Le degré coupe-feu suit fidèlement
  // le classement **stocké** : ce n'est pas un défaut, c'est une conséquence du
  // premier — et l'étude d'impact est faite pour la montrer.
  const memoire = [dit("Hauteur", "31 m"), ...saine.slice(1)];
  const audit = auditerLaMemoire(memoire);

  assert.equal(audit.compte.differentes, 1);
  assert.equal(audit.verdicts.find((l) => l.sujet === "Degré CF").verdict, VERDICT.IDENTIQUE);
});

test("une valeur retouchée à la main se voit, même si la règle n'a pas bougé", () => {
  // Comparer la règle à sa propre conclusion manquerait ce cas : c'est la ligne
  // du projet qui a été changée, pas le raisonnement.
  const memoire = [
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "2e famille")
  ];

  const audit = auditerLaMemoire(memoire);
  const derive = audit.verdicts[0];
  assert.equal(derive.verdict, VERDICT.DIFFERENTE);
  assert.equal(derive.affirmee, "2e famille");
  assert.equal(derive.conclue, "3e famille B");
});

test("une règle qu'on ne peut pas évaluer n'est pas une dérive", () => {
  // Une entrée qui manque est une lacune, pas une contradiction. Les confondre
  // ferait crier au défaut sur un projet simplement incomplet.
  const memoire = [
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B")
  ];

  const audit = auditerLaMemoire(memoire);
  assert.equal(audit.tient, true);
  assert.equal(audit.compte.indecidables, 1);
  assert.deepEqual(audit.verdicts[0].manquants, ["Hauteur"]);
  // Elle appelle tout de même un geste : il manque quelque chose au projet.
  assert.equal(cequiAppelleUnGeste(audit).length, 1);
});

test("une règle qui a perdu son objet est une dérive, pas une lacune", () => {
  // « si A alors B », sans sinon : A est faux, la règle ne dit plus rien — et
  // pourtant le projet affirme encore ce qu'elle avait conclu.
  const memoire = [
    dit("Classement", "2e famille"),
    regle("Colonne sèche", "exigée", [egal("Classement", "3e famille B")]),
    dit("Colonne sèche", "exigée")
  ];

  const audit = auditerLaMemoire(memoire);
  assert.equal(audit.tient, false);
  assert.equal(audit.compte.sansObjet, 1);
  assert.equal(audit.verdicts[0].conclue, "");
});

test("chaque zone s'audite seule", () => {
  const memoire = [
    dit("Hauteur", "26 m", { zones: ["batiment-a"] }),
    dit("Hauteur", "31 m", { zones: ["batiment-b"] }),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { zones: ["batiment-a"], sinon: "4e famille" }),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { zones: ["batiment-b"], sinon: "4e famille" }),
    dit("Classement", "3e famille B", { zones: ["batiment-a"] }),
    dit("Classement", "3e famille B", { zones: ["batiment-b"] })
  ];

  const audit = auditerLaMemoire(memoire);
  assert.equal(audit.compte.differentes, 1);
  assert.equal(audit.verdicts.find((l) => l.verdict === VERDICT.DIFFERENTE).zone, "batiment-b");
});

test("ce que l'audit n'a pas pu regarder se compte, et se nomme", () => {
  // Taire les opaques ferait passer « rien à signaler » pour « tout a été
  // vérifié ».
  const memoire = [
    ...saine,
    deduite("Zone de neige", "A2", "deduction_zone_neige_commune_V1"),
    deduite("Profondeur hors gel", "0.71 m", "deduction_profondeur_hors_gel_altitude_V1")
  ];

  const audit = auditerLaMemoire(memoire);
  assert.equal(audit.tient, true);
  assert.equal(audit.compte.opaques, 2);
  assert.deepEqual(audit.opaques.map((a) => a.payload.subject).sort(), ["Profondeur hors gel", "Zone de neige"]);
});

test("une mémoire sans règle ne se dit ni saine ni malade : elle n'a rien à auditer", () => {
  const audit = auditerLaMemoire([dit("Hauteur", "26 m")]);
  assert.equal(audit.regles, 0);
  assert.equal(audit.tient, true);
  assert.deepEqual(audit.verdicts, []);
});

test("ce qui appelle un geste vient dans l'ordre de la gravité", () => {
  const memoire = [
    // Une dérive.
    dit("Hauteur", "31 m"),
    regle("Classement", "3e famille B", [auPlus("Hauteur", "28", "m")], { sinon: "4e famille" }),
    dit("Classement", "3e famille B"),
    // Une règle sans objet.
    regle("Colonne sèche", "exigée", [egal("Classement", "4e famille")]),
    dit("Colonne sèche", "exigée"),
    // Une lacune.
    regle("Isolement", "1 h", [auPlus("Portance", "0,2", "MPa")]),
    dit("Isolement", "1 h")
  ];

  assert.deepEqual(
    cequiAppelleUnGeste(auditerLaMemoire(memoire)).map((l) => l.verdict),
    [VERDICT.DIFFERENTE, VERDICT.SANS_OBJET, VERDICT.INDECIDABLE]
  );
});
