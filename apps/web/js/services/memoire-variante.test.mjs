import test from "node:test";
import assert from "node:assert/strict";

import {
  consequencesDeLaVariante, laMemoireABouge, memoireAvecLaVariante, valeursSubstituables,
  variantePourLEcran
} from "./memoire-variante.js";

/** L'altitude du site, telle que le projet la pose. Aucun nom réel nulle part. */
const altitude = (dite, at = "2026-01-10T09:00:00Z") => ({
  id: "ddb-altitude", kind: "base-datum", subject_key: "altitude-du-site", nature: "donnee-de-base",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `Altitude du site : ${dite}`, payload: { subject: "Altitude du site", value: dite, declared: true }
});

/** Une contrainte du site, déduite, qui garde l'altitude sur laquelle elle a été calculée. */
const deduite = ({ id, sujet, valeur, utilitaire, alt, reserves = [] }) => ({
  id, kind: "site-constraint", subject_key: `site:${id}`, nature: "contrainte",
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, derived: true, utilitaire, reserves, inputs: { altitude: alt } }
});

const horsGel = (valeur, alt) => deduite({
  id: "frost", sujet: "Profondeur hors gel", valeur, alt,
  utilitaire: "deduction_profondeur_hors_gel_altitude_V1"
});

const neige = (zone, alt, reserves = []) => deduite({
  id: "snow", sujet: "Zone de neige", valeur: zone, alt, reserves,
  utilitaire: "deduction_zone_neige_commune_V1"
});

/**
 * Une règle appliquée, qui lit un sujet et en produit un autre.
 *
 * Ses conditions sont écrites pour **tenir** sur la mémoire d'essai : une règle
 * dont les conditions ne tiennent pas est déclarée sans objet, et une condition
 * posée au hasard fabriquerait une dérive qui n'existe pas.
 */
const regle = (sujet, valeur, lit = [], { sinon = "" } = {}) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
  decided_at: "2026-01-10T09:00:00Z",
  payload: { subject: sujet, value: valeur, referentiel: true, regle: { conditions: lit, sinon, sauf: [] } }
});

const auPlus = (sujet, seuil, unite) => ({ sujet, operateur: "<=", valeur: seuil, unite });
const auMoins = (sujet, seuil, unite) => ({ sujet, operateur: ">=", valeur: seuil, unite });
const vaut = (sujet, valeur) => ({ sujet, operateur: "=", valeur });

/** Une valeur simple du projet, posée et non déduite. */
const dit = (sujet, valeur) => ({
  id: `a-${sujet}`, kind: "base-datum", nature: "donnee-de-base", subject_key: sujet,
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur, declared: true }
});

/** La substitution telle que l'écran la formera : affirmation → valeur essayée. */
const essayer = (id, valeur) => new Map([[id, valeur]]);

test("on ne fait varier que le socle, jamais ce que les règles concluent", () => {
  const memoire = [
    altitude("490 m"),
    dit("Classement", "3e famille B"),
    horsGel("0.99 m", 490),
    regle("Degré CF", "CF 1 h", [vaut("Classement", "3e famille B")]),
    dit("Degré CF", "CF 1 h")
  ];

  const sujets = valeursSubstituables(memoire).map((entree) => entree.sujet).sort();

  // Le socle : ce que le projet pose. Pas la contrainte déduite — un utilitaire
  // l'a calculée —, pas le degré CF — une règle le conclut.
  assert.deepEqual(sujets, ["Altitude du site", "Classement"]);
});

test("substituer une valeur dérivée est refusé, et dit pourquoi", () => {
  // Réécrire la conclusion sans toucher au raisonnement afficherait une chaîne
  // qui ne mène plus à ce qu'elle montre : exactement le défaut que l'audit
  // cherche.
  const memoire = [
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [vaut("Classement", "3e famille B")]),
    dit("Degré CF", "CF 1 h")
  ];

  const rendu = consequencesDeLaVariante({ assertions: memoire, substitutions: essayer("a-Degré CF", "CF 2 h") });
  assert.equal(rendu.ok, false);
  assert.match(rendu.raison, /seul le socle/);
});

test("changer une valeur du socle rejoue les règles qui en découlent", () => {
  // La variante n'a plus rien de particulier : elle substitue, elle rejoue,
  // elle montre l'écart. Aucun sujet n'y est privilégié.
  const memoire = [
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1/2 h", [vaut("Classement", "3e famille B")], { sinon: "CF 1 h" }),
    dit("Degré CF", "CF 1/2 h")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("a-Classement", "4e famille")
  });

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.rejouees.map((l) => [l.sujet, l.avant, l.apres]), [["Degré CF", "CF 1/2 h", "CF 1 h"]]);
  assert.deepEqual(rendu.aRevoir, []);
  // La trace dit ce que la règle a lu pour conclure.
  assert.deepEqual(rendu.rejouees[0].trace.map((c) => [c.sujet, c.lu, c.verite]), [
    ["Classement", "4e famille", false]
  ]);
});

test("les conséquences se rangent en trois rangs qui ne se mélangent pas", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    neige("A2", 490),
    // Ce qui repose sur la cote hors gel sans qu'on sache le rejouer : la règle
    // la lit — d'où le lien —, mais elle lit aussi un sujet que personne n'a
    // versé, et « vrai et ? » ne tranche pas.
    regle("Ancrage des semelles", "0.99 m", [
      auMoins("Profondeur hors gel", "0,50", "m"),
      auPlus("Portance du sol", "0,2", "MPa")
    ]),
    dit("Ancrage des semelles", "0.99 m"),
    // Ce qui ne dépend de rien de tout cela.
    dit("Classement du bâtiment", "3e famille B")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("ddb-altitude", "1200 m")
  });

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.recalculees.map((l) => l.sujet).sort(), ["Profondeur hors gel", "Zone de neige"]);
  assert.deepEqual(rendu.aRevoir.map((l) => l.sujet), ["Ancrage des semelles"]);
  assert.equal(rendu.aRevoir[0].motif, "en-decoule");
  // L'altitude, les deux recalculées et la ligne à revoir sont touchées ; la
  // règle appliquée et le classement ne le sont pas.
  assert.equal(rendu.inchangees, 2);
});

test("une valeur recalculée à l'identique ne rend rien suspect en aval", () => {
  // La zone de neige ne bouge pas sous 900 m : ce qui en découle n'a aucune
  // raison de devenir suspect, et le dire suspect serait un faux signal.
  const memoire = [
    altitude("490 m"),
    neige("A2", 490),
    regle("Charge de neige", "0,45 kN/m²", [vaut("Zone de neige", "A2")]),
    dit("Charge de neige", "0,45 kN/m²")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("ddb-altitude", "600 m")
  });
  assert.equal(rendu.recalculees[0].valeurABouge, false);
  assert.equal(rendu.recalculees[0].reservesOntBouge, false);
  assert.deepEqual(rendu.aRevoir, []);
});

test("une relecture d'utilitaire nourrit le rejeu des règles qui la lisent", () => {
  // C'est le chaînage complet : l'altitude change, l'utilitaire connu est relu,
  // et la règle qui lit son résultat bascule — deux natures de nœud à la file.
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    regle("Fondations profondes", "non exigées", [auPlus("Profondeur hors gel", "1,00", "m")], {
      sinon: "exigées"
    }),
    dit("Fondations profondes", "non exigées")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("ddb-altitude", "890 m")
  });

  assert.deepEqual(rendu.recalculees.map((l) => [l.sujet, l.apres]), [["Profondeur hors gel", "1.09 m"]]);
  assert.deepEqual(rendu.rejouees.map((l) => [l.sujet, l.avant, l.apres]), [
    ["Fondations profondes", "non exigées", "exigées"]
  ]);
  assert.deepEqual(rendu.aRevoir, []);
});

test("une dérive déjà présente n'est pas mise au compte de la variante", () => {
  // La règle conclut déjà autre chose que ce que le projet affirme : c'est un
  // défaut de la mémoire, que l'audit dira. L'attribuer à la variante ferait
  // porter à celui qui essaie une valeur la dérive de ceux qui l'ont précédé.
  const memoire = [
    dit("Commune", "Grenoble"),
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [vaut("Classement", "2e famille")], { sinon: "CF 1/2 h" }),
    dit("Degré CF", "CF 1 h")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("a-Commune", "Chamonix")
  });
  assert.deepEqual(rendu.rejouees, []);
});

test("ce qu'on ne sait pas rejouer est nommé, jamais deviné", () => {
  const v2 = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0.99 m", alt: 490,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V2"
  });
  const rendu = consequencesDeLaVariante({
    assertions: [altitude("490 m"), v2], substitutions: essayer("ddb-altitude", "890 m")
  });

  assert.deepEqual(rendu.recalculees, []);
  assert.deepEqual(rendu.aRevoir.map((l) => l.sujet), ["Profondeur hors gel"]);
  assert.equal(rendu.aRevoir[0].motif, "utilitaire");
  assert.match(rendu.aRevoir[0].pourquoi, /deduction_profondeur_hors_gel_altitude_V2/);
});

test("une variante sans changement, ou vers une valeur vide, est refusée", () => {
  const memoire = [altitude("490 m")];

  assert.match(
    consequencesDeLaVariante({ assertions: memoire, substitutions: essayer("ddb-altitude", "490 m") }).raison,
    /pas de variante/
  );
  assert.match(
    consequencesDeLaVariante({ assertions: memoire, substitutions: essayer("ddb-altitude", "  ") }).raison,
    /besoin d'une valeur/
  );
  assert.match(
    consequencesDeLaVariante({ assertions: memoire, substitutions: new Map() }).raison,
    /Rien n'a été changé/
  );
});

test("la mémoire sous la variante rend une autre liste, sans rien écrire", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490), dit("Commune", "Grenoble")];
  const copie = JSON.parse(JSON.stringify(memoire));

  const vue = memoireAvecLaVariante(memoire, { substitutions: essayer("ddb-altitude", "890 m") });

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

test("le calque distingue « recalculée », « relue » et « rejouée »", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    neige("A2", 490),
    regle("Fondations profondes", "non exigées", [auPlus("Profondeur hors gel", "1,00", "m")], {
      sinon: "exigées"
    }),
    dit("Fondations profondes", "non exigées")
  ];

  const vue = memoireAvecLaVariante(memoire, { substitutions: essayer("ddb-altitude", "890 m") });
  const effet = (sujet) => vue.find(
    (l) => l.payload?.subject === sujet && !l.payload?.referentiel
  )?.variante?.effet;

  assert.equal(effet("Altitude du site"), "variante");
  assert.equal(effet("Profondeur hors gel"), "recalculee");
  // La zone de neige ne bouge ni de valeur ni de réserve sous 890 m : on a
  // regardé, rien n'a changé, et c'est une information.
  assert.equal(effet("Zone de neige"), "relue");
  assert.equal(effet("Fondations profondes"), "rejouee");
});

test("ce qui reste à revérifier garde sa valeur d'avant", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    // Sa règle lit la cote hors gel — d'où le lien — et un sujet que personne
    // n'a versé : elle reste indécidable.
    regle("Ancrage des semelles", "0.99 m", [
      auMoins("Profondeur hors gel", "0,50", "m"),
      auPlus("Portance du sol", "0,2", "MPa")
    ]),
    dit("Ancrage des semelles", "0.99 m")
  ];

  const vue = memoireAvecLaVariante(memoire, { substitutions: essayer("ddb-altitude", "890 m") });
  const ancrage = vue.find((l) => l.payload?.subject === "Ancrage des semelles" && !l.payload?.referentiel);

  assert.equal(ancrage.variante.effet, "a-revoir");
  // Une valeur inventée ici serait indiscernable d'une valeur calculée.
  assert.equal(ancrage.payload.value, "0.99 m");
  assert.match(ancrage.variante.pourquoi, /Portance du sol/);
});

test("supposer l'altitude de départ se demande, ne se prend jamais", () => {
  const sansEntrees = {
    ...horsGel("0.71 m", 13),
    payload: { ...horsGel("0.71 m", 13).payload, inputs: null }
  };
  const memoire = [altitude("13 m"), sansEntrees];
  const substitutions = essayer("ddb-altitude", "890 m");

  // Sans le geste : nommée, pas relue — et l'écran sait qu'elle est supposable.
  const stricte = consequencesDeLaVariante({ assertions: memoire, substitutions });
  assert.equal(stricte.recalculees.length, 0);
  assert.equal(stricte.supposables, 1);

  const supposee = consequencesDeLaVariante({ assertions: memoire, substitutions, supposer: true });
  assert.equal(supposee.recalculees[0].suppose, true);
  assert.equal(supposee.recalculees[0].apres, "0.93 m");
  assert.deepEqual(supposee.aRevoir, []);

  // Et la mémoire relue le dit sur la ligne, sans quoi le chiffre supposé
  // deviendrait indiscernable d'un chiffre calculé.
  const gardee = variantePourLEcran({ consequences: supposee });
  assert.equal(gardee.suppose, true);
  assert.equal(memoireAvecLaVariante(memoire, gardee)[1].variante.effet, "supposee");

  // Sans le drapeau, le calque refait le calcul strict : rien n'est supposé
  // par accident.
  assert.equal(memoireAvecLaVariante(memoire, { substitutions })[1].variante.effet, "a-revoir");
});

test("une variante sans conséquences lisibles rend la mémoire telle quelle", () => {
  const memoire = [dit("Commune", "Grenoble")];
  assert.equal(memoireAvecLaVariante(memoire, { substitutions: essayer("inconnue", "x") }), memoire);
  assert.equal(memoireAvecLaVariante(memoire, null), memoire);
});

test("une variante retient l'état de la mémoire sur laquelle elle a été faite", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490)];
  const consequences = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("ddb-altitude", "890 m")
  });
  const gardee = variantePourLEcran({ consequences, at: "2026-02-01T10:00:00Z" });

  assert.deepEqual(gardee.depart, [{ sujet: "Altitude du site", depuis: "490 m", vers: "890 m" }]);
  assert.equal(gardee.recalculees, 1);
  assert.equal(gardee.calculeeAu, "2026-02-01T10:00:00Z");

  assert.equal(laMemoireABouge(gardee, memoire), false);
  // Une affirmation de plus, et les conséquences affichées peuvent être fausses
  // avec exactement le même air qu'avant.
  assert.equal(laMemoireABouge(gardee, [...memoire, dit("Commune", "Grenoble")]), true);
});

test("plusieurs valeurs se font varier ensemble", () => {
  // Rien dans le moteur n'impose une variante à une seule valeur : ce qui coûte
  // est le rejeu, et il est le même pour une substitution ou pour dix.
  const memoire = [
    dit("Classement", "3e famille B"),
    dit("Type de couverture", "tuiles"),
    regle("Degré CF", "CF 1/2 h", [vaut("Classement", "3e famille B")], { sinon: "CF 1 h" }),
    dit("Degré CF", "CF 1/2 h"),
    regle("Écran sous toiture", "exigé", [vaut("Type de couverture", "tuiles")], { sinon: "non exigé" }),
    dit("Écran sous toiture", "exigé")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire,
    substitutions: new Map([["a-Classement", "4e famille"], ["a-Type de couverture", "bac acier"]])
  });

  assert.deepEqual(rendu.depart.map((e) => [e.sujet, e.vers]), [
    ["Classement", "4e famille"], ["Type de couverture", "bac acier"]
  ]);
  assert.deepEqual(rendu.rejouees.map((l) => [l.sujet, l.apres]).sort(), [
    ["Degré CF", "CF 1 h"], ["Écran sous toiture", "non exigé"]
  ]);
});
