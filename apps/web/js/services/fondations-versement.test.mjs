import test from "node:test";
import assert from "node:assert/strict";

import {
  affirmationsDeLEtude, fonctionVersable, cotesVersables, sortiesDeLEtude,
  sujetDeLaSemelle, ecrire
} from "./fondations-versement.js";
import { applicationsDeLaMemoire } from "./memoire-applications.js";
import { planDeRecalcul, NOEUD, natureDuNoeud, sortiesDesRegles } from "./memoire-plan.js";
import { cerveauDuProjet } from "./memoire-cerveau.js";
import { evaluerLaRegle, rejouerLaRegle, DOUTE, VERDICT } from "./memoire-evaluateur.js";

const SEMELLES = [
  { id: "a", designation: "File A", nombre: 9,
    entrees: { sectionLx: 1.2, sectionLy: 1.2, hauteurLz: 0.9, araseSuperieure: -0.1, hauteurFut: 0, futA: 0, futB: 0 } },
  { id: "b", designation: "Pignon", nombre: 4,
    entrees: { sectionLx: 1.5, sectionLy: 1.5, hauteurLz: 1, araseSuperieure: -0.1, hauteurFut: 0, futA: 0, futB: 0 } }
];

const RESULTATS = [
  { resultat: { bilan: { verifie: true, ratio: 0.82 } } },
  { resultat: { bilan: { verifie: false, ratio: 1.14 } } }
];

test("un nombre s'écrit à la française — la mémoire compare des phrases", () => {
  assert.equal(ecrire(1.2), "1,20");
  assert.equal(ecrire(0.99, 3), "0,990");
  assert.equal(ecrire("pas un nombre"), "");
});

test("le nom d'un résultat porte l'appui : vingt « Section Lx » seraient un seul sujet", () => {
  assert.equal(sujetDeLaSemelle("Section Lx", "File A"), "Section Lx de la semelle File A");
});

test("chaque massif apprend sept faits au projet, et le tableau son total", () => {
  const sorties = sortiesDeLEtude(SEMELLES, RESULTATS);
  assert.equal(sorties.length, 2 * 7 + 1);
  assert.ok(sorties.some((s) => s.sujet === "Volume de béton des fondations superficielles"));
});

test("« non calculée » n'est ni vérifiée ni en défaut", () => {
  const sansResultat = sortiesDeLEtude([SEMELLES[0]], [null]);
  const verdict = sansResultat.find((s) => s.sujet.startsWith("Vérification"));
  assert.equal(verdict.valeur, "non calculée");
});

test("une semelle dont le calcul a échoué part quand même : la taire ferait un massif de moins", () => {
  const sorties = sortiesDeLEtude(SEMELLES, [RESULTATS[0], { error: "le serveur a refusé" }]);
  assert.ok(sorties.some((s) => s.sujet === "Section Lx de la semelle Pignon"));
  assert.equal(sorties.find((s) => s.sujet === "Vérification de la semelle Pignon").valeur, "non calculée");
});

test("l'appel se verse comme une fonction, pas comme une valeur", () => {
  const fonction = fonctionVersable(SEMELLES, RESULTATS, "Bâtiment A");
  assert.equal(fonction.referentiel, true, "une fonction se range dans un .ref");
  assert.equal(fonction.native.utilitaire, "dimensionnement_fondations_superficielles");
  assert.equal(fonction.native.version, "V1");
  assert.deepEqual(fonction.native.lit, ["Profondeur hors gel"]);
  assert.equal(fonction.native.ecrit.length, 15);
});

test("sa valeur dit la taille de l'appel, jamais les verdicts", () => {
  // Les verdicts sont sur les lignes. Les redire ici ferait une seconde vérité,
  // et les deux divergeraient au premier recalcul qui ne reverserait pas le résumé.
  const fonction = fonctionVersable(SEMELLES, RESULTATS, "Bâtiment A");
  assert.equal(fonction.valeur, "2 massifs");
  assert.doesNotMatch(fonction.valeur, /vérifi/i);
});

test("une étude vide ne propose rien — pas même une fonction qui n'aurait rien fait", () => {
  assert.equal(fonctionVersable([], [], "Bâtiment A"), null);
  assert.deepEqual(affirmationsDeLEtude([], [], "Bâtiment A"), []);
});

test("la fonction se lit avant ce qu'elle a décidé", () => {
  const lignes = affirmationsDeLEtude(SEMELLES, RESULTATS, "Bâtiment A");
  assert.equal(lignes[0].referentiel, true);
  assert.ok(lignes.slice(1).every((ligne) => !ligne.referentiel));
});

test("ce que la fonction a lu s'enregistre à la date de l'appel, en français", () => {
  const fonction = fonctionVersable(SEMELLES, RESULTATS, "Bâtiment A", {
    rappels: { profondeurHorsGel: { valeur: "0.99" } }
  });
  assert.deepEqual(fonction.lectures, [{ sujet: "Profondeur hors gel", valeur: "0,990 m" }]);
});

test("les entrées de saisie ne partent pas : ce ne sont pas des faits du projet", () => {
  const sujets = cotesVersables(SEMELLES, RESULTATS, "Bâtiment A").map((ligne) => ligne.sujet).join(" | ");
  for (const saisie of ["angle", "enrobage", "butée", "cohésion", "charges"]) {
    assert.doesNotMatch(sujets.toLowerCase(), new RegExp(saisie), `${saisie} n'a rien à faire en mémoire`);
  }
});

/** La mémoire telle qu'elle est après le versement, en assertions. */
function memoireDuProjet() {
  let rang = 0;
  const enAssertion = (ligne) => ({
    id: `a${++rang}`, project_id: "p", subject_key: ligne.sujet,
    statement: `${ligne.sujet} : ${ligne.valeur}`,
    payload: {
      subject: ligne.sujet, value: ligne.valeur, zones: ligne.zones,
      referentiel: ligne.referentiel === true ? true : null,
      native: ligne.native ?? null, utilitaire: ligne.utilitaire ?? null,
      lectures: ligne.lectures ?? null, domain: ligne.domaine ?? null
    },
    nature: ligne.nature ?? null, domain: ligne.domaine ?? null
  });

  return [
    { id: "z0", project_id: "p", subject_key: "Altitude du site", statement: "Altitude du site : 1 200 m",
      payload: { subject: "Altitude du site", value: "1200 m", zones: ["Bâtiment A"] }, nature: "donnee-de-base" },
    { id: "z1", project_id: "p", subject_key: "Profondeur hors gel", statement: "Profondeur hors gel : 0,99 m",
      payload: { subject: "Profondeur hors gel", value: "0,99 m", zones: ["Bâtiment A"],
        utilitaire: "deduction_profondeur_hors_gel_altitude_V1",
        lectures: [{ sujet: "Altitude du site", valeur: "1200 m" }] }, nature: "contrainte" },
    ...affirmationsDeLEtude(SEMELLES, RESULTATS, "Bâtiment A", {
      rappels: { profondeurHorsGel: { valeur: "0.99" } }
    }).map(enAssertion)
  ];
}

test("la chaîne tient : altitude → profondeur hors gel → chacune des cotes", () => {
  const memoire = memoireDuProjet();
  const applications = applicationsDeLaMemoire(memoire, { projectId: "p" });

  // L'utilitaire du hors gel lit l'altitude.
  assert.ok(applications.some((ligne) =>
    ligne.output_assertion_id === "z1" && ligne.input_assertion_id === "z0"));

  // Et la fonction native lit le hors gel pour **chacune** des quinze sorties.
  const parLaFonction = applications.filter((ligne) => ligne.rule_assertion_id === "a1");
  assert.equal(parLaFonction.length, 15);
  assert.ok(parLaFonction.every((ligne) =>
    ligne.input_subject === "Profondeur hors gel" && ligne.input_assertion_id === "z1"));
});

test("les cotes sont dérivées, jamais du socle : une variante doit les refaire", () => {
  const memoire = memoireDuProjet();
  const produites = sortiesDesRegles(memoire);
  const cote = memoire.find((a) => a.subject_key === "Section Lx de la semelle File A");
  assert.equal(natureDuNoeud(cote, { produites }), NOEUD.REJOUABLE);

  const plan = planDeRecalcul(memoire);
  assert.equal(plan.socle, 1, "seule l'altitude est du socle");
  assert.equal(plan.rejouables, 15);
  assert.equal(plan.cycles.length, 0);
});

test("le cerveau la compte comme une fonction, et ne l'annonce pas comme une lacune", () => {
  const memoire = memoireDuProjet();
  const applications = applicationsDeLaMemoire(memoire, { projectId: "p" });
  const cerveau = cerveauDuProjet(memoire, applications, { avecLesFonctions: true });

  assert.equal(cerveau.compte.fonctions, 1);
  assert.equal(cerveau.compte.reglesSansEntree, 0, "elle a une entrée, et elle est enregistrée");
  // Une fonction native ne conclut pas sur son propre nom : ses conclusions sont
  // les sujets qu'elle a écrits, et ils sont tous versés.
  assert.equal(cerveau.compte.conclusionsSansValeur, 0);
});

test("le navigateur ne prétend pas rejouer ce dont il n'a pas la loi", () => {
  const fonction = memoireDuProjet().find((a) => a.payload?.native);

  const evaluation = evaluerLaRegle(fonction);
  assert.equal(evaluation.decidable, false);
  assert.deepEqual(evaluation.doutes, [DOUTE.LOI_NON_ECRITE]);

  // Sans cette sortie, zéro condition se combinait en « vrai » et le rejeu
  // annonçait que la fonction tient — sans avoir rien calculé.
  assert.equal(rejouerLaRegle(fonction).verdict, VERDICT.INDECIDABLE);
});

test("une cote qui ne vérifie pas n'est pas « retenue » : le projet ne la tient pas", () => {
  const lignes = cotesVersables(SEMELLES, RESULTATS, "Bâtiment A");
  const tient = lignes.find((l) => l.sujet === "Section Lx de la semelle File A");
  const echoue = lignes.find((l) => l.sujet === "Section Lx de la semelle Pignon");
  assert.equal(tient.statut, "retenu");
  assert.equal(echoue.statut, "contesté");

  const inconnue = cotesVersables([SEMELLES[0]], [null], "Bâtiment A")
    .find((l) => l.sujet === "Section Lx de la semelle File A");
  assert.equal(inconnue.statut, "en attente", "« je ne sais pas » n'est pas « ça ne passe pas »");
});
