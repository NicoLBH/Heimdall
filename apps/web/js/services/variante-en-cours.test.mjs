import test from "node:test";
import assert from "node:assert/strict";

import {
  abandonnerLaVariante, essayerLaVariante, onLitUneVariante, quandLaVarianteChange, varianteEnCours
} from "./variante-en-cours.js";

test.afterEach(() => abandonnerLaVariante());

test("on lit la mémoire tant qu'aucune variante n'est posée", () => {
  assert.equal(varianteEnCours(), null);
  assert.equal(onLitUneVariante(), false);
});

test("poser une variante remplace celle qui était là", () => {
  // Deux variantes superposées ne se lisent pas : « et si l'altitude était de
  // 890 m, sur la mémoire où elle vaut déjà 1 200 m » n'est une phrase pour
  // personne.
  essayerLaVariante({ vers: "890 m" });
  essayerLaVariante({ vers: "1 200 m" });
  assert.equal(varianteEnCours().vers, "1 200 m");
});

test("les écrans sont prévenus quand on entre et quand on sort", () => {
  const vues = [];
  const desabonner = quandLaVarianteChange((variante) => vues.push(variante?.vers ?? null));

  essayerLaVariante({ vers: "890 m" });
  abandonnerLaVariante();
  // Sortir deux fois ne prévient qu'une : on ne redessine pas pour rien.
  abandonnerLaVariante();

  assert.deepEqual(vues, ["890 m", null]);
  desabonner();
  essayerLaVariante({ vers: "300 m" });
  assert.deepEqual(vues, ["890 m", null]);
});

test("un écran qui se redessine mal ne prive pas les autres de la nouvelle", () => {
  const vues = [];
  const casse = quandLaVarianteChange(() => { throw new Error("cet écran est cassé"); });
  const sain = quandLaVarianteChange((variante) => vues.push(variante?.vers ?? null));

  essayerLaVariante({ vers: "890 m" });

  assert.deepEqual(vues, ["890 m"]);
  casse();
  sain();
});
