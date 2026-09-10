import test from "node:test";
import assert from "node:assert/strict";

import { getSeismicSizingValues } from "../supabase/functions/_shared/utilitaires/seismic-spectrum.js";
import { ligneDuSpectre, phraseDuSpectre } from "../apps/web/js/services/spectre-versement.js";
import { reprendreLeSpectre } from "../apps/web/js/services/spectre-reprise.js";

/**
 * La loi du spectre, vérifiée contre le vrai module.
 *
 * ## Pourquoi ce fichier est ici et pas à côté du service
 *
 * Aucun fichier d'`apps/web` ne remonte vers `supabase/functions` : le
 * navigateur suivrait l'import et le module partirait avec la page. C'est une
 * règle du dépôt, et `verifie-cloison.test.mjs` la tient. La copie de `vendor/`,
 * elle, n'existe qu'après le build, et les tests tournent avant.
 *
 * `scripts/` n'est servi à personne : ce fichier peut donc importer les deux
 * côtés et vérifier que ce qui se verse est bien ce que la loi rend. Sans lui,
 * les tests du service ne vérifieraient que des formes.
 *
 * ## Ce qu'il vérifie, et ce qu'il ne vérifie pas
 *
 * Quelques points **du texte** — l'accélération de la zone 4, le paramètre de
 * sol C, le coefficient d'une catégorie III —, choisis parce qu'ils changent si
 * l'annexe nationale change. Il ne rejoue pas l'Eurocode entier : ce n'est pas
 * un test de la norme, c'est un test du branchement.
 */

const BRIANCON = {
  zoneSismique: "4",
  soilClass: "C",
  importanceCategory: "Catégorie d'importance III",
  dampingRatio: "5"
};

test("la ligne versée porte les valeurs que le texte donne", () => {
  // Zone 4 : agr = 1,6 m/s². Catégorie III : γI = 1,2. Sol C hors zone 5 :
  // S = 1,5, TB = 0,06 s, TC = 0,4 s, TD = 2 s. Amortissement de référence :
  // η = 1.
  assert.deepEqual(ligneDuSpectre(getSeismicSizingValues(BRIANCON)), {
    agr: "1,6", gammaI: "1,2", ag: "1,92", eta: "1", S: "1,5",
    TB: "0,06", TC: "0,4", TD: "2"
  });
});

test("la phrase du spectre dit l'accélération de calcul, pas celle du rocher", () => {
  // ag = agr × γI. C'est ag qui entre dans les calculs de structure, et
  // afficher agr à sa place minorerait l'action sismique de vingt pour cent.
  assert.equal(
    phraseDuSpectre(ligneDuSpectre(getSeismicSizingValues(BRIANCON))),
    "ag = 1,92 m/s² · S = 1,5 · TB/TC/TD = 0,06/0,4/2 s"
  );
});

test("une zone que le zonage ne connaît pas ne rend pas un spectre", () => {
  assert.equal(ligneDuSpectre(getSeismicSizingValues({ ...BRIANCON, zoneSismique: "9" })), null);
});

test("changer la zone refait le spectre, pour de vrai", () => {
  // La démonstration : déplacer un projet change sa zone, donc son spectre,
  // donc tout ce qui se dimensionne dessus. Zone 2 : agr tombe de 1,6 à 0,7.
  const refait = reprendreLeSpectre({
    entrees: { ...BRIANCON },
    champs: { zoneSismique: "2" },
    calculer: getSeismicSizingValues
  });

  assert.equal(refait.tableau[0].agr, "0,7");
  assert.equal(refait.tableau[0].ag, "0,84");
});

test("changer la classe de sol refait le spectre, périodes comprises", () => {
  // Un sol mou amplifie **et** déplace les périodes : deux projets identiques
  // sur C et sur D ne se ferraillent pas pareil.
  const refait = reprendreLeSpectre({
    entrees: { ...BRIANCON },
    champs: { soilClass: "D" },
    calculer: getSeismicSizingValues
  });

  assert.equal(refait.tableau[0].S, "1,6");
  assert.equal(refait.tableau[0].TC, "0,6");
});

test("un amortissement supérieur à 5 % abaisse le spectre", () => {
  const refait = reprendreLeSpectre({
    entrees: { ...BRIANCON },
    champs: { dampingRatio: "10" },
    calculer: getSeismicSizingValues
  });

  // η = √(10 / (5 + ξ)), plancher à 0,55. À 10 % : environ 0,8165.
  assert.equal(refait.tableau[0].eta, "0,8165");
});
