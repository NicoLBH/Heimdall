import test from "node:test";
import assert from "node:assert/strict";

import {
  ATELIER,
  appelVersable,
  entreesVersables,
  ligneDuSpectre,
  lignesVersables,
  nombreEcrit,
  phraseDuSpectre,
  spectreVersable
} from "./spectre-versement.js";
import { entreesDuProjet, reprendreLeSpectre } from "./spectre-reprise.js";
import {
  AGENT_D_SPECTRE_ELASTIQUE_EC8_V1 as AGENT,
  SUJET_AMORTISSEMENT,
  SUJET_CATEGORIE_IMPORTANCE,
  SUJET_CLASSE_DE_SOL,
  SUJET_SPECTRE,
  SUJET_ZONE_SISMIQUE
} from "../utilitaires/agent-spectre.js";

/**
 * Le module du spectre **n'est pas importé ici**, et ce n'est pas un manque.
 *
 * Aucun fichier d'`apps/web` ne remonte vers `supabase/functions` : le navigateur
 * suivrait l'import et le module partirait avec la page — c'est une règle du
 * dépôt, tenue par `scripts/verifie-cloison.test.mjs`. Sa copie de `vendor/`
 * n'existe qu'après le build, et les tests tournent avant.
 *
 * Le faux ci-dessous **ne recopie donc aucune table** : ses nombres sont
 * arbitraires et le disent. Une copie des vraies valeurs serait une seconde loi
 * qui vieillirait sans qu'on le sache (règle 4). Ce fichier vérifie la **forme**
 * — ce qui se verse, dans quel ordre, ce qui refuse — et les valeurs de la loi
 * se vérifient contre le vrai module dans `scripts/spectre-loi.test.mjs`.
 */
const FAUX = { agr: 9.1, gl: 9.2, ag: 9.3, eta: 9.4, S: 9.5, TB: 9.6, TC: 9.7, TD: 9.8 };
const dimensionne = (patch = {}) => ({ ...FAUX, ...patch });

const SAISIE = {
  zoneSismique: "4",
  soilClass: "C",
  importanceCategory: "Catégorie d'importance III",
  dampingRatio: "5"
};

/* ── La ligne du spectre ─────────────────────────────────────────────────── */

test("un nombre s'écrit comme la mémoire l'écrit, sans zéros inutiles", () => {
  assert.equal(nombreEcrit(1.35), "1,35");
  assert.equal(nombreEcrit(3), "3");
  assert.equal(nombreEcrit(0.9999999999), "1");
  // `Number(null)` vaut zéro, et un zéro est une valeur : l'absence s'écarte
  // avant, sans quoi une accélération manquante s'écrirait « 0 m/s² ».
  assert.equal(nombreEcrit(null), "");
  assert.equal(nombreEcrit(""), "");
});

test("le spectre se verse en une ligne, huit colonnes déclarées", () => {
  // Les colonnes, dans l'ordre de la déclaration — et `gl` se range sous son
  // nom de déclaration, `gammaI`.
  assert.deepEqual(ligneDuSpectre(dimensionne()), {
    agr: "9,1", gammaI: "9,2", ag: "9,3", eta: "9,4", S: "9,5",
    TB: "9,6", TC: "9,7", TD: "9,8"
  });
});

test("un spectre sans accélération n'est pas un spectre", () => {
  // Sept colonnes sur huit feraient passer une lacune pour une courbe.
  assert.equal(ligneDuSpectre(dimensionne({ ag: null })), null);
  assert.equal(ligneDuSpectre(null), null);
});

test("la phrase du spectre nomme ce qu'un ingénieur cherche en premier", () => {
  assert.equal(
    phraseDuSpectre(ligneDuSpectre(dimensionne())),
    "ag = 9,3 m/s² · S = 9,5 · TB/TC/TD = 9,6/9,7/9,8 s"
  );
});

/* ── Ce que le projet verse ──────────────────────────────────────────────── */

test("les trois choix du projet se versent, la zone non", () => {
  // La zone est posée par l'utilitaire qui la déduit de la commune. Deux écrans
  // qui poseraient le même sujet en feraient deux valeurs concurrentes.
  const entrees = entreesVersables(SAISIE, "batiment-a");

  assert.deepEqual(entrees.map((ligne) => [ligne.sujet, ligne.valeur]), [
    [SUJET_CLASSE_DE_SOL, "C"],
    [SUJET_CATEGORIE_IMPORTANCE, "Catégorie d'importance III"],
    [SUJET_AMORTISSEMENT, "5 %"]
  ]);
  assert.ok(entrees.every((ligne) => ligne.nature === "donnee-de-base"));
  assert.ok(entrees.every((ligne) => ligne.provenance.type === "décision"));
  assert.deepEqual(entrees[0].zones, ["batiment-a"]);
  assert.equal(entrees[0].atelier, ATELIER);
});

test("l'appel dit ce qu'il a lu, la zone comprise", () => {
  const appel = appelVersable(SAISIE, ligneDuSpectre(dimensionne()));

  assert.equal(appel.referentiel, true);
  assert.equal(appel.agent.genre, "agent-D");
  assert.equal(appel.agent.utilitaire, "agent_d_spectre_elastique_ec8");
  assert.deepEqual(appel.agent.ecrit, [{ sujet: SUJET_SPECTRE }]);

  // La zone est lue et enregistrée telle qu'elle a servi : c'est ce qui dira,
  // plus tard, que ce spectre a été tracé sur une zone changée depuis.
  assert.deepEqual(appel.lectures, [
    { sujet: SUJET_ZONE_SISMIQUE, valeur: "4" },
    { sujet: SUJET_CLASSE_DE_SOL, valeur: "C" },
    { sujet: SUJET_CATEGORIE_IMPORTANCE, valeur: "Catégorie d'importance III" },
    { sujet: SUJET_AMORTISSEMENT, valeur: "5 %" }
  ]);
});

test("sans spectre calculé, ni l'appel ni la courbe ne se versent", () => {
  assert.equal(appelVersable(SAISIE, null), null);
  assert.equal(spectreVersable(null), null);
});

test("le spectre versé porte sa forme, jamais ses quarante et un points", () => {
  const versable = spectreVersable(ligneDuSpectre(dimensionne()), "", SAISIE);

  assert.equal(versable.sujet, SUJET_SPECTRE);
  assert.equal(versable.tableau.length, 1);
  // La courbe est entièrement déterminée par ces huit colonnes : l'écrire en
  // plus serait l'écrire deux fois.
  assert.deepEqual(versable.structure.map((colonne) => colonne.cle), [
    "agr", "gammaI", "ag", "eta", "S", "TB", "TC", "TD"
  ]);
  assert.equal(versable.nature, "contrainte");
  assert.equal(versable.utilitaire, "agent_d_spectre_elastique_ec8_V1");
});

test("les lignes se lisent dans l'ordre de la chaîne", () => {
  const lignes = lignesVersables({ saisie: SAISIE, dimensionnement: dimensionne() });

  assert.deepEqual(lignes.map((ligne) => ligne.sujet), [
    SUJET_CLASSE_DE_SOL,
    SUJET_CATEGORIE_IMPORTANCE,
    SUJET_AMORTISSEMENT,
    AGENT.libelle,
    SUJET_SPECTRE
  ]);
});

/* ── La reprise : ce qu'elle relit, et ce qu'elle passe au calcul ────────── */

const versee = (sujet, valeur) => ({
  id: sujet, kind: "base-datum", subject_key: sujet, nature: "donnee-de-base",
  status: "assumed", superseded_by: null,
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur }
});

const memoire = () => [
  versee(SUJET_ZONE_SISMIQUE, "4"),
  versee(SUJET_CLASSE_DE_SOL, "C"),
  versee(SUJET_CATEGORIE_IMPORTANCE, "Catégorie d'importance III"),
  versee(SUJET_AMORTISSEMENT, "5 %")
];

test("la reprise relit les entrées dans la mémoire, pas dans l'appel d'hier", () => {
  // Les lectures enregistrées disent ce que ce calcul-**là** avait lu. Entre
  // temps, quelqu'un a pu corriger la classe de sol.
  assert.deepEqual(entreesDuProjet(memoire()), {
    zoneSismique: "4", soilClass: "C",
    importanceCategory: "Catégorie d'importance III", dampingRatio: "5 %"
  });
});

test("sans zone de sismicité, le projet ne porte pas ses entrées", () => {
  assert.equal(entreesDuProjet(memoire().slice(1)), null);
});

test("la valeur essayée passe par-dessus, et rien d'autre ne bouge", () => {
  // C'est la seconde moitié de la démonstration : déplacer un projet change sa
  // zone, donc son spectre. Ce test dit **ce qui est passé au calcul** ; ce que
  // le calcul en fait est vérifié contre le vrai module, ailleurs.
  let recu = null;
  const refait = reprendreLeSpectre({
    entrees: entreesDuProjet(memoire()),
    champs: { zoneSismique: "2" },
    calculer: (entrees) => { recu = entrees; return dimensionne(); }
  });

  assert.deepEqual(recu, {
    zoneSismique: "2", soilClass: "C",
    importanceCategory: "Catégorie d'importance III", dampingRatio: "5 %"
  });
  assert.equal(refait.tableau.length, 1);
  assert.match(refait.valeur, /^ag = 9,3 m\/s²/);
});

test("une reprise sans entrées ni calcul ne rend rien plutôt qu'une courbe fausse", () => {
  assert.equal(reprendreLeSpectre({ entrees: null, calculer: () => dimensionne() }), null);
  assert.equal(reprendreLeSpectre({ entrees: entreesDuProjet(memoire()), calculer: null }), null);
  // Un calcul qui ne rend pas d'accélération ne rend pas une ligne.
  assert.equal(reprendreLeSpectre({
    entrees: entreesDuProjet(memoire()), calculer: () => dimensionne({ ag: null })
  }), null);
});
