/**
 * L'écran d'une variante : ce qu'on essaie et ce que cela change, ensemble.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderEcranDeVariante, varianteEnJson, ETAPE } from "./ecran-variante.js";

const VALEURS = [
  { id: "hg", sujet: "Profondeur hors gel", valeur: "0,47 m", zones: ["batiment-a"], lectures: 3 },
  { id: "alt", sujet: "Altitude du site", valeur: "13,22 m", zones: [], lectures: 0 }
];

test("l'écran pose la question et la réponse sur le même écran", () => {
  // C'est tout l'objet du changement : les fenêtres empilées ne laissaient
  // jamais voir la valeur essayée et ses conséquences en même temps.
  const html = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.CHOIX });

  assert.match(html, /Quelle valeur essaie-t-on/);
  assert.match(html, /Tester une variante/);
  assert.match(html, /data-variante-exporter/);
  // Et rien de modal : plus de `role="dialog"`, plus de croix de fermeture.
  assert.doesNotMatch(html, /aria-modal/);
});

test("la portée s'affiche sur la valeur choisie", () => {
  // Quatre « Altitude du site » ne diffèrent que par elle.
  const html = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.SAISIE, choisie: VALEURS[0] });
  assert.match(html, /batiment-a/);
  assert.match(html, /0,47 m/);
});

test("tant qu'on n'a pas calculé, le tableau dit ce qu'il attend", () => {
  // Un cadre vide se lit comme un écran cassé.
  const vide = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.CHOIX });
  assert.match(vide, /Choisissez une valeur du socle/);

  const attend = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.ATTENTE, choisie: VALEURS[0], saisie: "8 m" });
  assert.match(attend, /Rien n'y est écrit/);
  assert.match(attend, /Calcul en cours/);
});

test("le résultat porte ses deux gestes, et le second se refuse s'il ne dit rien", () => {
  const rendu = (bouge) => ({
    ok: true, recalculees: [], cycles: [], inchangees: 12, confirmees: 0, aRevoir: [], depart: [],
    rejouees: bouge ? [{ sujet: "Résultat", avant: "1 m", apres: "2 m", trace: [] }] : []
  });

  const avec = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "8 m", rendu: rendu(true)
  });
  assert.match(avec, /data-variante-abandonner/);
  assert.match(avec, /data-variante-lire(?![^>]*disabled)/);

  const sans = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "8 m", rendu: rendu(false)
  });
  assert.match(sans, /data-variante-lire disabled/);
});

test("l'export emporte de quoi refaire le raisonnement sans l'écran", () => {
  const json = varianteEnJson({
    projet: "p1", choisie: VALEURS[0], saisie: "8 m",
    rendu: {
      ok: true, recalculees: [], rejouees: [], cycles: [], inchangees: 12, confirmees: 0,
      aRevoir: [{ sujet: "Résultat du calcul", valeur: "11 massifs", motif: "utilitaire" }],
      depart: [{ id: "hg", vers: "8 m" }]
    }
  });

  assert.equal(json.format, "mdall.variante/1");
  assert.equal(json.depart.sujet, "Profondeur hors gel");
  assert.deepEqual(json.depart.zones, ["batiment-a"]);
  assert.equal(json.essaye, "8 m");
  assert.equal(json.resultat.aRevoir.length, 1);
  assert.equal(json.refus, null);
});

test("un refus s'exporte aussi : c'est une réponse", () => {
  const json = varianteEnJson({ choisie: VALEURS[0], saisie: "0,47 m", rendu: { ok: false, raison: "C'est déjà ce que le projet dit." } });
  assert.equal(json.resultat, null);
  assert.match(json.refus, /déjà ce que le projet dit/);
});
