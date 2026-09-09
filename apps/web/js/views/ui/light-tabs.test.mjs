/**
 * Le filet sous les onglets : un seul, et à la bonne largeur.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderLightTabs } from "./light-tabs.js";

const onglets = [
  { id: "changements", label: "Changements" },
  { id: "conversation", label: "Conversation" }
];

test("des onglets seuls ne portent pas d'enveloppe", () => {
  const rendu = renderLightTabs({ tabs: onglets, activeTabId: "changements" });
  assert.equal(rendu.includes("light-tabs-row"), false);
  assert.equal(rendu.includes("light-tabs--en-rangee"), false);
});

test("une rangée sans compteur ne dessine qu'un filet", () => {
  // Le défaut vu à l'écran : sur une proposition où rien n'a bougé, le compteur
  // d'ajouts est vide. La rangée pleine largeur restait — c'est voulu —, mais
  // le nav gardait son propre filet, tracé sur sa largeur à lui et seize pixels
  // plus haut que celui de la rangée. Deux traits décalés pour un seul soulignement.
  const rendu = renderLightTabs({
    tabs: onglets, activeTabId: "changements", rowClassName: "light-tabs-row--pleine"
  });

  assert.match(rendu, /light-tabs-row light-tabs-row--pleine/);
  assert.match(rendu, /light-tabs--en-rangee/, "le nav éteint le sien, la rangée trace le seul filet");
  // Rien à droite : la rangée ne fabrique pas une case vide pour autant.
  assert.equal(rendu.includes("light-tabs__trailing"), false);
});

test("un compteur suffit à faire la rangée, sans classe demandée", () => {
  const rendu = renderLightTabs({
    tabs: onglets, activeTabId: "changements", trailingHtml: '<span class="diff-stat">+3</span>'
  });

  assert.match(rendu, /light-tabs--en-rangee/);
  assert.match(rendu, /light-tabs__trailing/);
});
