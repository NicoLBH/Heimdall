/**
 * Une seule saisie d'adresse, pour trois écrans.
 *
 * Ce qui se teste ici est ce qui pouvait diverger : la traduction des noms de
 * coordonnées, le code INSEE sans lequel rien ne se calcule, et la
 * correspondance entre les colonnes de la localisation versée et les champs du
 * service d'adresses.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  nombreOuRien,
  LONGUEUR_MINIMALE,
  DELAI_DE_FRAPPE,
  propositionsDAdresse,
  localisationDeLAdresse,
  adresseEnUneLigne,
  localisationCalculable,
  colonneDeLaLocalisation,
  valeurDeLaColonne
} from "./adresse-saisie.js";
import { SUJET_LOCALISATION, STRUCTURE_DE_LA_LOCALISATION } from "../utilitaires/agents-climatiques.js";
import { altitudeVersable } from "./localisation-versement.js";
import { mesureEcrite } from "../utilitaires/lecture-fait.js";

/** Ce que le service d'adresses rend d'une résolution — `lat`/`lon`, pas `latitude`. */
const RESOLUE = {
  address: "12 avenue de la Gare 74000 Annecy",
  city: "Annecy",
  postalCode: "74000",
  codeInsee: "74010",
  lat: 45.9,
  lon: 6.13,
  sourceUrl: "https://exemple.test/adresse"
};

/* ── Les propositions ────────────────────────────────────────────────────── */

test("une proposition sans libellé ne s'offre pas : on ne clique pas une ligne vide", () => {
  const rendu = propositionsDAdresse([{ label: "" }, { label: "12 rue Basse, Lyon" }, {}]);
  assert.deepEqual(rendu.map((p) => p.libelle), ["12 rue Basse, Lyon"]);
});

test("la même adresse deux fois ne s'offre qu'une fois", () => {
  // Deux lignes identiques font hésiter, et l'hésitation est du temps perdu sur
  // un geste qui doit être bref.
  const rendu = propositionsDAdresse([
    { label: "12 Rue Basse, Lyon" },
    { label: "12 rue basse, LYON" },
    { label: "14 rue Basse, Lyon" }
  ]);
  assert.deepEqual(rendu.map((p) => p.libelle), ["12 Rue Basse, Lyon", "14 rue Basse, Lyon"]);
});

test("la liste s'arrête où on l'arrête, et l'objet d'origine reste joignable", () => {
  const items = Array.from({ length: 9 }, (_, rang) => ({ label: `${rang} rue Longue`, kind: "StreetAddress" }));
  const rendu = propositionsDAdresse(items, { limite: 4 });
  assert.equal(rendu.length, 4);
  assert.equal(rendu[0].item.kind, "StreetAddress");
});

test("ce qui n'est pas une liste ne fait pas tomber la saisie", () => {
  assert.deepEqual(propositionsDAdresse(null), []);
  assert.deepEqual(propositionsDAdresse(undefined), []);
});

test("on ne cherche pas sur deux lettres, et on laisse la frappe finir", () => {
  assert.equal(LONGUEUR_MINIMALE, 3);
  assert.ok(DELAI_DE_FRAPPE >= 100, "un délai trop court interroge le service à chaque touche");
});

/* ── Ce qu'on garde d'une adresse résolue ────────────────────────────────── */

test("`lat`/`lon` deviennent `latitude`/`longitude` **ici**, et nulle part ailleurs", () => {
  // C'est la divergence qui coûtait le plus cher : l'écran lisait
  // `resolved.latitude`, recevait `undefined`, et la carte restait floue sans
  // qu'un mot le dise.
  const rendu = localisationDeLAdresse(RESOLUE);
  assert.equal(rendu.latitude, 45.9);
  assert.equal(rendu.longitude, 6.13);
  assert.equal(rendu.codeInsee, "74010");
  assert.equal(rendu.city, "Annecy");
  assert.equal(rendu.postalCode, "74000");
  assert.equal(rendu.address, "12 avenue de la Gare 74000 Annecy");
});

test("une coordonnée absente reste absente : `null`, et non zéro", () => {
  // Zéro est un point au large du golfe de Guinée. Il se dessine très bien.
  const rendu = localisationDeLAdresse({ address: "Sans coordonnées" });
  assert.equal(rendu.latitude, null);
  assert.equal(rendu.longitude, null);
});

test("ce qui n'est pas une adresse ne se traduit pas", () => {
  assert.equal(localisationDeLAdresse(null), null);
  assert.equal(localisationDeLAdresse("12 rue Basse"), null);
});

test("l'adresse se relit en une ligne, et se replie sur la commune quand il n'y a pas de rue", () => {
  assert.equal(adresseEnUneLigne(localisationDeLAdresse(RESOLUE)), "12 avenue de la Gare 74000 Annecy");
  assert.equal(adresseEnUneLigne({ city: "Briançon", postalCode: "05100" }), "05100 Briançon");
  assert.equal(adresseEnUneLigne(null), "");
});

/* ── Ce qui manque pour calculer ─────────────────────────────────────────── */

test("sans code INSEE, rien ne se calcule — et c'est le seul qui bloque", () => {
  assert.equal(localisationCalculable(localisationDeLAdresse(RESOLUE)), true);
  assert.equal(localisationCalculable({ city: "Annecy", postalCode: "74000" }), false);
  assert.equal(localisationCalculable(null), false);
});

/* ── La localisation dans une variante ───────────────────────────────────── */

const valeurDuSocle = (cle) => ({
  id: `loc#${cle}`,
  assertion: { payload: { subject: SUJET_LOCALISATION } },
  champ: { cle, nom: cle }
});

test("une colonne de la localisation se reconnaît par son sujet, pas par son libellé", () => {
  assert.equal(colonneDeLaLocalisation(valeurDuSocle("codeInsee")), "codeInsee");
  assert.equal(colonneDeLaLocalisation(valeurDuSocle("commune")), "commune");
});

test("ce qui n'est pas la localisation ne déclenche pas la saisie d'adresse", () => {
  assert.equal(colonneDeLaLocalisation({
    assertion: { payload: { subject: "Altitude du site" } }, champ: { cle: "commune" }
  }), "");
  assert.equal(colonneDeLaLocalisation(null), "");
});

test("chaque colonne déclarée sait ce qu'une adresse choisie y met", () => {
  // Le jour où une cinquième colonne s'ajoute à la structure versée, ce test
  // tombe — plutôt qu'une chaîne vide substituée en silence.
  const choisie = localisationDeLAdresse(RESOLUE);
  const attendu = {
    commune: "Annecy", codeInsee: "74010", codePostal: "74000", adresse: RESOLUE.address,
    // Six décimales : le dixième de mètre. C'est ce qui permet de voir qu'un
    // projet a bougé de cent mètres sans changer de commune.
    latitude: "45.900000", longitude: "6.130000"
  };

  for (const colonne of STRUCTURE_DE_LA_LOCALISATION) {
    assert.equal(valeurDeLaColonne(choisie, colonne.cle), attendu[colonne.cle],
      `la colonne « ${colonne.nom} » ne sait pas ce qu'une adresse y met`);
  }
});

test("une colonne inconnue rend le vide, et ne devine pas", () => {
  assert.equal(valeurDeLaColonne(localisationDeLAdresse(RESOLUE), "departement"), "");
  assert.equal(valeurDeLaColonne(null, "commune"), "");
});

/* ── `null` n'est pas zéro ───────────────────────────────────────────────── */

test("une coordonnée absente vaut `null`, jamais zéro", () => {
  // Zéro est un point au large du golfe de Guinée. Un projet sans coordonnées
  // demandait une carte satellite de l'Atlantique, au lieu de montrer qu'il
  // n'avait pas de localisation.
  assert.equal(nombreOuRien(null), null);
  assert.equal(nombreOuRien(undefined), null);
  assert.equal(nombreOuRien(""), null);
  assert.equal(nombreOuRien("   "), null);
  assert.equal(nombreOuRien("pas un nombre"), null);
  // Zéro **dit** reste zéro : la latitude de l'équateur existe.
  assert.equal(nombreOuRien(0), 0);
  assert.equal(nombreOuRien("45.9"), 45.9);
});

/* ── Une altitude qu'on ne connaît pas ───────────────────────────────────── */

test("une altitude inconnue ne s'écrit pas « 0,00 m »", () => {
  // `Number(null)` vaut zéro. Une adresse dont le relief n'a pas répondu portait
  // donc une altitude de zéro mètre, et un site au niveau de la mer devenait
  // indistinguable d'un site qu'on n'a pas relevé.
  assert.equal(mesureEcrite(null, 2, "m"), "");
  assert.equal(mesureEcrite(undefined, 2, "m"), "");
  assert.equal(mesureEcrite("", 2, "m"), "");
  // Zéro **dit** reste zéro : il y a des projets au niveau de la mer.
  assert.equal(mesureEcrite(0, 2, "m"), "0,00 m");
  assert.equal(mesureEcrite(448, 2, "m"), "448,00 m");
});

test("et elle ne se propose donc pas à la mémoire", () => {
  // C'est là que cela coûtait le plus cher : la ligne partait, signée, et le
  // hors gel se calculait sur une altitude que personne n'avait relevée.
  assert.equal(altitudeVersable({ city: "Annecy", altitude: null }), null);
  assert.equal(altitudeVersable({ city: "Annecy" }), null);
  assert.equal(altitudeVersable({ city: "Annecy", altitude: 448 })?.valeur, "448,00 m");
});
