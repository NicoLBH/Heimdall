import test from "node:test";
import assert from "node:assert/strict";

import {
  altitudeDeLaMemoire, altitudeEnTexte, consequencesDeLaVariante, laMemoireABouge,
  lireUnNombre, memoireAvecLaVariante, relireLaContrainte, variantePourLEcran
} from "./variante-altitude.js";

/** L'altitude du site, telle que le projet la pose. Aucun nom réel nulle part. */
const altitude = (dite, at = "2026-01-10T09:00:00Z") => ({
  id: "ddb-altitude", kind: "base-datum", subject_key: "altitude-du-site", nature: "donnee-de-base",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `Altitude du site : ${dite}`, payload: { subject: "Altitude du site", value: dite, declared: true }
});

/** Une contrainte du site, déduite, qui garde l'altitude sur laquelle elle a été calculée. */
const deduite = ({ id, sujet, valeur, utilitaire, alt, reserves = [], at = "2026-01-10T09:00:00Z" }) => ({
  id, kind: "site-constraint", subject_key: `site:${id}`, nature: "contrainte",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, derived: true, utilitaire, reserves, inputs: { altitude: alt } }
});

/** Une règle appliquée, qui lit un sujet et en produit un autre. */
const regle = (sujet, valeur, lit = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
  decided_at: "2026-01-10T09:00:00Z",
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: { conditions: lit.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })), sauf: [] }
  }
});

/** Une valeur simple du projet. */
const dit = (sujet, valeur) => ({
  id: `a-${sujet}`, subject_key: sujet, status: "assumed", superseded_by: null,
  decided_at: "2026-01-10T09:00:00Z", statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur }
});

const horsGel = (valeur, alt) => deduite({
  id: "frost", sujet: "Profondeur hors gel", valeur, alt,
  utilitaire: "deduction_profondeur_hors_gel_altitude_V1"
});

const neige = (zone, alt, reserves = []) => deduite({
  id: "snow", sujet: "Zone de neige", valeur: zone, alt, reserves,
  utilitaire: "deduction_zone_neige_commune_V1"
});

test("un nombre se lit qu'il soit écrit à la française ou à l'anglaise", () => {
  assert.equal(lireUnNombre("490,03 m"), 490.03);
  assert.equal(lireUnNombre("490.03"), 490.03);
  assert.equal(lireUnNombre("1 200 m"), 1200);
  assert.equal(lireUnNombre(340), 340);
  // Une chaîne vide ne vaut pas zéro : `Number("")` vaut zéro, et une altitude
  // à zéro se calcule sans broncher jusqu'à une cote de fondation fausse.
  assert.ok(Number.isNaN(lireUnNombre("")));
  assert.ok(Number.isNaN(lireUnNombre("environ")));
});

test("l'altitude du projet se lit dans la mémoire, ou ne s'y lit pas", () => {
  const lue = altitudeDeLaMemoire([altitude("490,03 m"), dit("Commune", "Grenoble")]);
  assert.equal(lue.metres, 490.03);
  assert.equal(lue.valeur, "490,03 m");

  assert.equal(altitudeDeLaMemoire([dit("Commune", "Grenoble")]), null);
});

test("la profondeur hors gel se relit sans la table départementale", () => {
  // H = H0 + (altitude − 150) / 4000. H0 est le même des deux côtés : il se
  // simplifie, et l'écart suffit. Rien du serveur ne descend au navigateur.
  //
  // La cote s'écrit avec un point : c'est ce que l'utilitaire écrit, et une
  // relecture qui reformaterait ferait passer pour un changement de valeur ce
  // qui n'est qu'un changement de virgule.
  const relue = relireLaContrainte(horsGel("0.99 m", 490), 890);
  assert.equal(relue.avant, "0.99 m");
  assert.equal(relue.apres, "1.09 m");
  assert.equal(relue.valeurABouge, true);
});

test("au-delà de 900 m la zone de neige ne change pas, sa réserve apparaît", () => {
  const relue = relireLaContrainte(neige("A2", 490), 1200);
  assert.equal(relue.apres, "A2");
  assert.equal(relue.valeurABouge, false);
  assert.deepEqual(relue.reservesApres, ["altitude-hors-table"]);
  assert.equal(relue.reservesOntBouge, true);
});

test("redescendre sous 900 m lève la réserve d'altitude", () => {
  const relue = relireLaContrainte(neige("A2", 1200, ["altitude-hors-table"]), 400);
  assert.deepEqual(relue.reservesApres, []);
  assert.equal(relue.reservesOntBouge, true);
});

test("une contrainte déduite par une version inconnue n'est jamais recalculée", () => {
  // Mieux vaut « je ne sais pas » qu'un chiffre rendu d'après la mauvaise loi :
  // c'est le seul garde-fou qui empêche de présenter du propagé pour du calculé.
  const v2 = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0,99 m", alt: 490,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V2"
  });
  assert.equal(relireLaContrainte(v2, 890), null);

  const { aRevoir, recalculees } = consequencesDeLaVariante({
    assertions: [altitude("490 m"), v2], altitude: 890
  });
  assert.equal(recalculees.length, 0);
  assert.deepEqual(aRevoir.map((ligne) => ligne.sujet), ["Profondeur hors gel"]);
  assert.equal(aRevoir[0].motif, "lit-altitude");
});

test("une contrainte versée sans ses entrées est nommée, jamais oubliée", () => {
  // Le vrai défaut du premier jet : une cote hors gel écrite avant qu'on
  // conserve les entrées tombait dans « inchangé », comptée comme sans rapport
  // avec l'altitude. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien.
  const sansEntrees = {
    id: "frost", kind: "site-constraint", subject_key: "site:frost_depth", nature: "contrainte",
    status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
    statement: "Profondeur hors gel : 0.99 m",
    payload: { subject: "Profondeur hors gel", value: "0.99 m", derived: true, reserves: ["entrees-inconnues"],
      utilitaire: "deduction_profondeur_hors_gel_altitude_V1", inputs: null }
  };

  const rendu = consequencesDeLaVariante({ assertions: [altitude("490 m"), sansEntrees], altitude: 890 });

  assert.deepEqual(rendu.recalculees, []);
  assert.deepEqual(rendu.aRevoir.map((ligne) => ligne.sujet), ["Profondeur hors gel"]);
  assert.equal(rendu.aRevoir[0].motif, "lit-altitude");
  assert.match(rendu.aRevoir[0].pourquoi, /ne dit pas sur quelle altitude/);
  assert.equal(rendu.inchangees, 0);
});

test("une version qu'on ne sait pas relire dit laquelle", () => {
  const v2 = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0.99 m", alt: 490,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V2"
  });
  const rendu = consequencesDeLaVariante({ assertions: [altitude("490 m"), v2], altitude: 890 });
  assert.match(rendu.aRevoir[0].pourquoi, /deduction_profondeur_hors_gel_altitude_V2/);
});

test("le calque garde la valeur d'avant, pour que l'écran montre l'écart", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490), neige("A2", 490)];
  const vue = memoireAvecLaVariante(memoire, { altitude: 890 });

  assert.deepEqual(vue[0].variante, { effet: "variante", avant: "490 m", pourquoi: "" });
  assert.deepEqual(vue[1].variante, { effet: "recalculee", avant: "0.99 m", pourquoi: "" });
  // La zone de neige ne bouge ni de valeur ni de réserve sous 890 m : elle est
  // « relue », pas « recalculée » — on a regardé, rien n'a changé.
  assert.deepEqual(vue[2].variante, { effet: "relue", avant: "A2", pourquoi: "" });
});

test("supposer l'altitude de départ se demande, ne se prend jamais", () => {
  const sansEntrees = {
    id: "frost", kind: "site-constraint", subject_key: "site:frost_depth", nature: "contrainte",
    status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
    statement: "Profondeur hors gel : 0.71 m",
    payload: { subject: "Profondeur hors gel", value: "0.71 m", derived: true, reserves: [],
      utilitaire: "deduction_profondeur_hors_gel_altitude_V1", inputs: null }
  };
  const memoire = [altitude("13 m"), sansEntrees];

  // Sans le geste : nommée, pas relue — et l'écran sait qu'elle est supposable.
  const stricte = consequencesDeLaVariante({ assertions: memoire, altitude: 890 });
  assert.equal(stricte.recalculees.length, 0);
  assert.equal(stricte.supposables, 1);

  // Avec le geste : relue, et la ligne porte la supposition partout.
  const supposee = consequencesDeLaVariante({ assertions: memoire, altitude: 890, supposer: true });
  assert.equal(supposee.recalculees[0].suppose, true);
  assert.equal(supposee.recalculees[0].altitudeDepart, 13);
  assert.equal(supposee.recalculees[0].apres, "0.93 m");
  assert.deepEqual(supposee.aRevoir, []);

  // Et la mémoire relue le dit sur la ligne, sans quoi le chiffre supposé
  // deviendrait indiscernable d'un chiffre calculé.
  const gardee = variantePourLEcran({ altitude: 890, consequences: supposee });
  assert.equal(gardee.suppose, true);
  const vue = memoireAvecLaVariante(memoire, gardee);
  assert.equal(vue[1].variante.effet, "supposee");
  assert.match(vue[1].variante.pourquoi, /supposée calculée à 13 m/);

  // Sans le drapeau, le calque refait le calcul strict : rien n'est supposé
  // par accident.
  assert.equal(memoireAvecLaVariante(memoire, { altitude: 890 })[1].variante.effet, "a-revoir");
});

test("les conséquences se rangent en trois rangs qui ne se mélangent pas", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    neige("A2", 490),
    // Ce qui repose sur la cote hors gel : nommé, jamais recalculé ici.
    regle("Ancrage des semelles", "0.99 m", ["Profondeur hors gel"]),
    dit("Ancrage des semelles", "0.99 m"),
    // Ce qui ne dépend de rien de tout cela.
    dit("Classement du bâtiment", "3e famille B")
  ];

  const rendu = consequencesDeLaVariante({ assertions: memoire, altitude: 1200 });

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.recalculees.map((ligne) => ligne.sujet).sort(), ["Profondeur hors gel", "Zone de neige"]);
  assert.deepEqual(rendu.aRevoir.map((ligne) => ligne.sujet), ["Ancrage des semelles"]);
  assert.equal(rendu.aRevoir[0].motif, "en-decoule");
  // L'altitude elle-même, les deux recalculées et la ligne à revoir sont
  // touchées ; la règle appliquée et le classement ne le sont pas.
  assert.equal(rendu.inchangees, 2);
});

test("une valeur recalculée à l'identique ne rend rien suspect en aval", () => {
  // La zone de neige ne bouge pas sous 900 m : ce qui en découle n'a aucune
  // raison de devenir suspect, et le dire suspect serait un faux signal.
  const memoire = [
    altitude("490 m"),
    neige("A2", 490),
    regle("Charge de neige", "0,45 kN/m²", ["Zone de neige"]),
    dit("Charge de neige", "0,45 kN/m²")
  ];

  const rendu = consequencesDeLaVariante({ assertions: memoire, altitude: 600 });
  assert.equal(rendu.recalculees[0].valeurABouge, false);
  assert.equal(rendu.recalculees[0].reservesOntBouge, false);
  assert.deepEqual(rendu.aRevoir, []);
});

test("on ne fait pas varier ce qui n'existe pas, ni vers ce qui ne se lit pas", () => {
  assert.match(
    consequencesDeLaVariante({ assertions: [dit("Commune", "Grenoble")], altitude: 800 }).raison,
    /pas d'altitude en mémoire/
  );
  assert.match(
    consequencesDeLaVariante({ assertions: [altitude("490 m")], altitude: NaN }).raison,
    /ne se lit pas comme un nombre/
  );
  assert.match(
    consequencesDeLaVariante({ assertions: [altitude("490 m")], altitude: 490 }).raison,
    /pas de variante/
  );
});

test("la mémoire sous la variante rend une autre liste, sans rien écrire", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490), dit("Commune", "Grenoble")];
  const copie = JSON.parse(JSON.stringify(memoire));

  const vue = memoireAvecLaVariante(memoire, { altitude: 890 });

  assert.equal(vue.length, memoire.length);
  assert.equal(vue[0].payload.value, "890 m");
  assert.equal(vue[0].variante.effet, "variante");
  assert.equal(vue[1].payload.value, "1.09 m");
  assert.equal(vue[1].statement, "Profondeur hors gel : 1.09 m");
  assert.equal(vue[1].variante.effet, "recalculee");
  // La troisième n'est pas touchée : elle est rendue telle quelle.
  assert.equal(vue[2], memoire[2]);
  // Et la mémoire d'origine n'a pas bougé d'un octet.
  assert.deepEqual(JSON.parse(JSON.stringify(memoire)), copie);
});

test("ce qu'on ne sait pas rejouer est marqué, jamais deviné", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    regle("Ancrage des semelles", "0.99 m", ["Profondeur hors gel"]),
    dit("Ancrage des semelles", "0.99 m")
  ];

  const vue = memoireAvecLaVariante(memoire, { altitude: 890 });
  const ancrage = vue.find((ligne) => ligne.payload?.subject === "Ancrage des semelles" && !ligne.payload?.referentiel);

  assert.equal(ancrage.variante.effet, "a-revoir");
  // Sa valeur est celle d'avant : on ne fabrique pas un chiffre indiscernable
  // d'un chiffre calculé.
  assert.equal(ancrage.payload.value, "0.99 m");
});

test("une variante sans conséquences lisibles rend la mémoire telle quelle", () => {
  const memoire = [dit("Commune", "Grenoble")];
  assert.equal(memoireAvecLaVariante(memoire, { altitude: 890 }), memoire);
  assert.equal(memoireAvecLaVariante(memoire, null), memoire);
});

test("une variante retient l'état de la mémoire sur laquelle elle a été faite", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490)];
  const consequences = consequencesDeLaVariante({ assertions: memoire, altitude: 890 });
  const gardee = variantePourLEcran({ altitude: 890, consequences, at: "2026-02-01T10:00:00Z" });

  assert.equal(gardee.depuis, "490 m");
  assert.equal(gardee.vers, "890 m");
  assert.equal(gardee.recalculees, 1);

  assert.equal(laMemoireABouge(gardee, memoire), false);
  // Une affirmation de plus, et les conséquences affichées peuvent être fausses
  // avec exactement le même air qu'avant.
  assert.equal(laMemoireABouge(gardee, [...memoire, dit("Commune", "Grenoble")]), true);
});

test("une altitude s'écrit comme la mémoire l'écrit", () => {
  assert.equal(altitudeEnTexte(890), "890 m");
  assert.equal(altitudeEnTexte(490.03), "490,03 m");
  assert.equal(altitudeEnTexte(NaN), "");
});
