import test from "node:test";
import assert from "node:assert/strict";

import { renderBoutonCopier, ICONES } from "./bouton-copier.js";

test("un bouton de copie porte ce qu'il copie, ou de quoi le retrouver", () => {
  // Le texte quand on l'a sous la main…
  const court = renderBoutonCopier({ texte: "Mémoire/incendie.ref" });
  assert.match(court, /data-copier-texte="Mémoire\/incendie\.ref"/);

  // …et une cible quand il est trop long pour un attribut : un diff de trois
  // cents lignes n'a rien à faire dans du HTML.
  const long = renderBoutonCopier({ cible: "diff:incendie" });
  assert.match(long, /data-copier="diff:incendie"/);
  assert.equal(long.includes("data-copier-texte"), false);
});

test("les deux info-bulles voyagent avec le bouton", () => {
  // Le retour est tout l'intérêt : le presse-papiers est le seul endroit de
  // l'interface qu'on ne peut pas regarder. Le bouton doit donc savoir seul
  // quoi dire une fois copié, sans que l'écouteur ait à le lui rappeler.
  const rendu = renderBoutonCopier({ texte: "x", titre: "Copier le chemin", titreCopie: "Chemin copié" });
  assert.match(rendu, /data-copier-titre="Copier le chemin"/);
  assert.match(rendu, /data-copier-titre-copie="Chemin copié"/);
  assert.match(rendu, /title="Copier le chemin"/);
  assert.match(rendu, /aria-label="Copier le chemin"/);
});

test("le dessin est celui de tout le monde", () => {
  assert.match(renderBoutonCopier({ texte: "x" }), /class="bouton-copier"/);
  assert.match(renderBoutonCopier({ texte: "x", className: "diff-groupe__copier" }),
    /class="bouton-copier diff-groupe__copier"/);
  assert.match(ICONES.copier, /icons\.svg#copy/);
  assert.match(ICONES.copie, /icons\.svg#check/);
});

test("ce qui vient de l'utilisateur ne s'échappe pas dans un attribut", () => {
  const rendu = renderBoutonCopier({ texte: '"><script>alert(1)</script>' });
  assert.equal(rendu.includes("<script>"), false);
});
