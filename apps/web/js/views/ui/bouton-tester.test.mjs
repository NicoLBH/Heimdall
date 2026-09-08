import test from "node:test";
import assert from "node:assert/strict";

import { ETAPE_ATTEINTE, USAGES, estServi, libelleDeLUsage } from "./bouton-tester.js";

test("les trois usages du moteur sont nommés, et dans l'ordre où on les lit", () => {
  assert.deepEqual(USAGES.map((usage) => usage.action), ["tester:variante", "tester:audit", "tester:impact"]);
  // Chacun dit ce qu'il fait : un item de menu sans phrase se lit comme un mot.
  for (const usage of USAGES) assert.ok(usage.quoi.length > 20, usage.action);
});

test("un usage que le moteur ne sert pas encore dit son étape", () => {
  // Le plan est dans `docs/rejouer-la-memoire.md`. L'étape 4 est faite : le plan
  // de recalcul est dérivé. L'audit demande le rejeu à blanc, qui est l'étape 5.
  assert.equal(ETAPE_ATTEINTE, 4);

  const impact = USAGES.find((usage) => usage.action === "tester:impact");
  const audit = USAGES.find((usage) => usage.action === "tester:audit");

  assert.equal(estServi(impact), true);
  assert.equal(libelleDeLUsage(impact), "Étude d'impact");

  assert.equal(estServi(audit), false);
  assert.equal(libelleDeLUsage(audit), "Auditer la mémoire — étape 5");
});

test("avancer le plan allume les usages, sans toucher au menu", () => {
  // La règle tient dans une comparaison : déplacer `ETAPE_ATTEINTE` d'un cran
  // suffit. Rien d'autre n'a à changer le jour où l'étape est faite.
  const servisA = (etape) => USAGES.filter((usage) => etape >= usage.depuisLEtape).map((usage) => usage.action);

  assert.deepEqual(servisA(0), ["tester:variante"]);
  assert.deepEqual(servisA(2), ["tester:variante", "tester:impact"]);
  assert.deepEqual(servisA(5), ["tester:variante", "tester:audit", "tester:impact"]);
});
