import test from "node:test";
import assert from "node:assert/strict";

import { NOEUD, natureDuNoeud, ordreDeLaZone, planDeRecalcul } from "./memoire-plan.js";

const regle = (sujet, alors, lit = [], { zones = null } = {}) => ({
  id: `r-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null, zones,
  payload: {
    subject: sujet, value: alors, referentiel: true, ...(zones ? { zones } : {}),
    regle: { conditions: lit.map((nom) => ({ sujet: nom, operateur: "=", valeur: "x" })), sinon: "", sauf: [] }
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

/** Une chaîne à quatre pas : hauteur → classement → degré → épaisseur. */
const chaine = [
  dit("Hauteur", "26 m"),
  regle("Classement", "3e famille B", ["Hauteur"]),
  dit("Classement", "3e famille B"),
  regle("Degré CF", "CF 1 h", ["Classement"]),
  dit("Degré CF", "CF 1 h"),
  regle("Épaisseur", "16 cm", ["Degré CF"]),
  dit("Épaisseur", "16 cm")
];

test("le plan range les dérivées par distance au socle", () => {
  const plan = planDeRecalcul(chaine);

  assert.equal(plan.zones.length, 1);
  assert.deepEqual(
    plan.zones[0].strates.map((strate) => strate.map((a) => a.payload.subject)),
    [["Classement"], ["Degré CF"], ["Épaisseur"]]
  );
  // Ce qui se dit d'un projet : « la plus longue chaîne fait trois pas ».
  assert.equal(plan.profondeur, 3);
  assert.equal(plan.rejouables, 3);
  assert.deepEqual(plan.zones[0].socle.map((a) => a.payload.subject), ["Hauteur"]);
});

test("deux valeurs indépendantes tiennent dans la même strate", () => {
  // La forme du raisonnement compte : deux branches parallèles ne sont pas une
  // chaîne de deux pas, et l'afficher ainsi mentirait sur sa profondeur.
  const memoire = [
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", ["Hauteur"]),
    dit("Classement", "3e famille B"),
    regle("Isolement", "1 h", ["Hauteur"]),
    dit("Isolement", "1 h")
  ];

  const plan = planDeRecalcul(memoire);
  assert.equal(plan.profondeur, 1);
  assert.deepEqual(plan.zones[0].strates[0].map((a) => a.payload.subject).sort(), ["Classement", "Isolement"]);
});

test("le compte de couverture dit ce qui se rejoue et ce qui ne se rejoue pas", () => {
  // C'est la mesure honnête de la promesse : sans elle, un graphe à moitié
  // opaque se lit comme un graphe entièrement rejouable.
  const memoire = [
    ...chaine,
    deduite("Zone de neige", "A2", "deduction_zone_neige_commune_V1"),
    deduite("Profondeur hors gel", "0.71 m", "deduction_profondeur_hors_gel_altitude_V1")
  ];

  const plan = planDeRecalcul(memoire);
  assert.equal(plan.rejouables, 3);
  assert.equal(plan.opaques, 2);
  assert.equal(plan.derivees, 5);
  assert.deepEqual(plan.zones[0].opaques.map((a) => a.payload.subject).sort(), ["Profondeur hors gel", "Zone de neige"]);
});

test("un nœud se range par ce qu'il est, pas par ce qu'il vaut", () => {
  const produites = new Set(["a-Classement"]);
  assert.equal(natureDuNoeud({ id: "a-Classement" }, { produites }), NOEUD.REJOUABLE);
  assert.equal(natureDuNoeud({ id: "a-neige", payload: { utilitaire: "x_V1" } }, { produites }), NOEUD.OPAQUE);
  assert.equal(natureDuNoeud({ id: "a-Hauteur" }, { produites }), NOEUD.SOCLE);
});

test("chaque zone porte son plan, et la profondeur est celle de la plus longue", () => {
  const memoire = [
    dit("Hauteur", "26 m", { zones: ["batiment-a"] }),
    regle("Classement", "3e famille B", ["Hauteur"], { zones: ["batiment-a"] }),
    dit("Classement", "3e famille B", { zones: ["batiment-a"] }),
    regle("Degré CF", "CF 1 h", ["Classement"], { zones: ["batiment-a"] }),
    dit("Degré CF", "CF 1 h", { zones: ["batiment-a"] }),

    dit("Hauteur", "31 m", { zones: ["batiment-b"] }),
    regle("Classement", "4e famille", ["Hauteur"], { zones: ["batiment-b"] }),
    dit("Classement", "4e famille", { zones: ["batiment-b"] })
  ];

  const plan = planDeRecalcul(memoire);
  const parZone = new Map(plan.zones.map((z) => [z.zone, z]));

  assert.equal(parZone.get("batiment-a").strates.length, 2);
  assert.equal(parZone.get("batiment-b").strates.length, 1);
  assert.equal(plan.profondeur, 2);
  // Le degré du bâtiment A ne se range pas dans le plan du bâtiment B.
  assert.equal(parZone.get("batiment-b").strates.flat().length, 1);
});

test("une composante qui se lit en rond n'a pas de rang : elle se montre", () => {
  const memoire = [
    regle("A", "1", ["B"]),
    dit("A", "1"),
    regle("B", "2", ["A"]),
    dit("B", "2"),
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", ["Hauteur"]),
    dit("Classement", "3e famille B")
  ];

  const plan = planDeRecalcul(memoire);

  assert.equal(plan.cycles.length, 1);
  assert.deepEqual(plan.cycles[0].noeuds.map((a) => a.payload.subject).sort(), ["A", "B"]);
  // Et ce qui n'est pas dans le cycle garde son plan : un cycle n'emporte pas
  // le reste de la zone.
  assert.deepEqual(plan.zones[0].strates.map((s) => s.map((a) => a.payload.subject)), [["Classement"]]);
});

test("l'ordre d'une zone se rend comme des clés de sujet, prêtes pour le rejeu", () => {
  assert.deepEqual(ordreDeLaZone(chaine), ["classement", "degre cf", "epaisseur"]);
});

test("une mémoire sans règle n'a pas de plan, et le dit par un plan vide", () => {
  const plan = planDeRecalcul([dit("Hauteur", "26 m"), dit("Commune", "Nantes")]);
  assert.deepEqual(plan.zones, []);
  assert.equal(plan.derivees, 0);
  assert.equal(plan.socle, 2);
});

test("ce qui a été remplacé ne compte pas dans le plan", () => {
  const memoire = [
    dit("Hauteur", "26 m"),
    regle("Classement", "3e famille B", ["Hauteur"]),
    { ...dit("Classement", "2e famille"), id: "a-vieux", superseded_by: "a-Classement" },
    dit("Classement", "3e famille B")
  ];
  const plan = planDeRecalcul(memoire);
  assert.equal(plan.rejouables, 1);
  assert.equal(plan.socle, 1);
});
