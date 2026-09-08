import test from "node:test";
import assert from "node:assert/strict";

import {
  REFUS, champsDeLAppel, contraintesAReprendre, phraseDuRefus, relectureDuFait, rejouerLesUtilitaires
} from "./utilitaires-rejeu.js";

const at = "2026-01-10T09:00:00Z";

/** Une donnée de base du projet. Aucun nom réel nulle part. */
const dit = (id, sujet, valeur) => ({
  id, kind: "base-datum", subject_key: sujet, nature: "donnee-de-base",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur, declared: true }
});

/** Une contrainte déduite, telle que le versement l'écrit. */
const deduite = ({ id, sujet, valeur, utilitaire, lectures = [], reserves = [] }) => ({
  id, kind: "site-constraint", subject_key: `site:${id}`, nature: "contrainte",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`,
  payload: {
    subject: sujet, value: valeur, derived: true, utilitaire, reserves,
    lectures: lectures.map(([sujetLu, valeurLue]) => ({ sujet: sujetLu, valeur: valeurLue }))
  }
});

const horsGel = (valeur) => deduite({
  id: "frost", sujet: "Profondeur hors gel", valeur,
  utilitaire: "deduction_profondeur_hors_gel_altitude_V1",
  lectures: [["H0 retenu pour le département", "0.5"], ["Altitude du site", "13"]]
});

const neige = (zone, reserves = []) => deduite({
  id: "snow", sujet: "Zone de neige", valeur: zone, reserves,
  utilitaire: "deduction_zone_neige_commune_V1",
  lectures: [["Altitude du site", "13"]]
});

const memoire = () => [
  dit("ddb-alt", "Altitude du site", "13 m"),
  dit("ddb-h0", "H0 retenu pour le département", "0,50 m"),
  horsGel("0.71 m"),
  neige("A1"),
  dit("ddb-com", "Commune", "Nantes")
];

/** Le dernier appel conservé pour cet outil : l'adresse qu'on va redemander. */
const dernierAppel = async () => ({ input_payload: { code_insee: "44109", city: "—", altitude: 13 } });

/* ── Ce qui est concerné, et par quoi ────────────────────────────────────── */

test("une contrainte est reprise quand elle déclare lire ce qu'on fait varier", () => {
  const reprises = contraintesAReprendre({
    enVigueur: memoire(), substitutions: new Map([["ddb-alt", "890 m"]])
  });

  // L'altitude entre dans l'appel **comme un nombre** : « 890 m » se lit ici.
  assert.deepEqual(reprises.map((r) => [r.sujet, r.outil, r.champs]), [
    ["Profondeur hors gel", "frost", { altitude: 890 }],
    ["Zone de neige", "snow", { altitude: 890 }]
  ]);
});

test("faire varier autre chose ne reprend rien", () => {
  // La commune n'est déclarée par aucun utilitaire : rien à redemander.
  assert.deepEqual(
    contraintesAReprendre({ enVigueur: memoire(), substitutions: new Map([["ddb-com", "Chamonix"]]) }),
    []
  );
});

test("un sujet qui n'entre pas dans l'appel est refusé, et dit pourquoi", () => {
  // H0 entre dans la formule sans entrer dans l'appel : le référentiel le prend
  // dans sa table départementale, et le lui imposer lui ferait dire autre chose
  // que le DTU.
  const [reprise] = contraintesAReprendre({
    enVigueur: memoire(), substitutions: new Map([["ddb-h0", "0,60 m"]])
  });

  assert.equal(reprise.sujet, "Profondeur hors gel");
  assert.equal(reprise.refus, REFUS.ENTREE_IMPOSSIBLE);
  assert.match(phraseDuRefus(reprise.refus), /le serveur la choisit lui-même/);
});

test("un utilitaire qui ne sait pas se rejouer est nommé, pas oublié", () => {
  const orpheline = deduite({
    id: "x", sujet: "Zone de sismicité", valeur: "3", utilitaire: "outil_disparu_V9",
    lectures: [["Altitude du site", "13"]]
  });

  const [reprise] = contraintesAReprendre({
    enVigueur: [dit("ddb-alt", "Altitude du site", "13 m"), orpheline],
    substitutions: new Map([["ddb-alt", "890 m"]])
  });
  assert.equal(reprise.refus, REFUS.SANS_REJEU);
});

test("les champs de l'appel se prennent des sujets déclarés, pas des noms de champs", () => {
  const { champs } = champsDeLAppel(horsGel("0.71 m"), new Map([["altitude du site", "890 m"]]));
  assert.deepEqual(champs, { altitude: 890 });
});

test("une valeur que le champ ne sait pas lire est refusée, jamais laissée passer", () => {
  // C'est le piège du jour : `toNullableNumber` rend `null`, le serveur retombe
  // sur zéro, et une cote de fondation se calcule au niveau de la mer sans qu'un
  // seul écran ne bronche.
  const { champs, refus } = champsDeLAppel(horsGel("0.71 m"), new Map([["altitude du site", "à confirmer"]]));

  assert.deepEqual(champs, {});
  assert.equal(refus, REFUS.VALEUR_ILLISIBLE);
  assert.match(phraseDuRefus(refus), /retomber sur zéro/);
});

/* ── Relire la réponse avec la loi de l'utilitaire, pas une copie ────────── */

test("la réponse du serveur est relue par l'utilitaire lui-même", () => {
  // Aucune loi n'est recopiée ici : on redonne le fait de contexte à `deduire`,
  // la même fonction qu'au versement. Une variante et un versement ne peuvent
  // donc pas dire deux choses différentes de la même situation.
  const reprise = { assertion: horsGel("0.71 m"), sujet: "Profondeur hors gel",
    utilitaire: "deduction_profondeur_hors_gel_altitude_V1" };

  const relue = relectureDuFait(reprise, {
    fact_value: { frost_depth_m: 0.935, h0_selected_m: 0.5, altitude: 890, inputs: { altitude: 890 }, reserves: [] }
  });

  assert.equal(relue.avant, "0.71 m");
  assert.equal(relue.apres, "0.94 m");
  assert.equal(relue.valeurABouge, true);
});

test("une réserve qui naît compte, même quand la valeur ne bouge pas", () => {
  // Au-delà de 900 m l'Annexe Nationale demande une étude. La zone est la même,
  // et le doute n'est pas le même : le taire ferait passer pour acquis ce qui ne
  // l'est plus.
  const reprise = { assertion: neige("A1"), sujet: "Zone de neige",
    utilitaire: "deduction_zone_neige_commune_V1" };

  const relue = relectureDuFait(reprise, {
    fact_value: { zone: "A1", inputs: { altitude: 1200 }, reserves: [] }
  });

  assert.equal(relue.valeurABouge, false);
  assert.deepEqual(relue.reservesApres, ["altitude-hors-table"]);
  assert.equal(relue.reservesOntBouge, true);
});

test("une réponse dont l'utilitaire ne tire rien ne rend rien", () => {
  const reprise = { assertion: horsGel("0.71 m"), sujet: "Profondeur hors gel",
    utilitaire: "deduction_profondeur_hors_gel_altitude_V1" };
  assert.equal(relectureDuFait(reprise, { fact_value: { frost_depth_m: null } }), null);
});

/* ── L'appel, de bout en bout ────────────────────────────────────────────── */

test("le rejeu redemande le même appel, avec la valeur essayée, et sans écrire", async () => {
  const appels = [];
  const appeler = async (quoi) => {
    appels.push(quoi);
    return {
      context_fact: {
        fact_key: quoi.toolKey === "frost" ? "frost_depth" : "snow_zone",
        fact_value: quoi.toolKey === "frost"
          ? { frost_depth_m: 0.935, h0_selected_m: 0.5, altitude: 890, inputs: { altitude: 890 }, reserves: [] }
          : { zone: "A1", inputs: { altitude: 890 }, reserves: [] }
      }
    };
  };

  const rendu = await rejouerLesUtilitaires({
    projectId: "p1", enVigueur: memoire(), substitutions: new Map([["ddb-alt", "890 m"]]),
    appeler, dernierAppel
  });

  // Le même appel que la dernière fois : l'adresse conservée, l'altitude essayée.
  assert.deepEqual(appels.map((a) => [a.toolKey, a.location.code_insee, a.location.altitude, a.dryRun]), [
    ["frost", "44109", 890, true],
    ["snow", "44109", 890, true]
  ]);

  assert.deepEqual(rendu.recalculees.map((l) => [l.sujet, l.avant, l.apres]), [
    ["Profondeur hors gel", "0.71 m", "0.94 m"],
    ["Zone de neige", "A1", "A1"]
  ]);
  assert.deepEqual(rendu.refusees, []);
});

test("un outil qui ne répond pas laisse sa valeur, et le dit", async () => {
  // Une variante partielle qui se dit partielle vaut mieux qu'un échec — et
  // infiniment mieux qu'un chiffre inventé à la place.
  const appeler = async () => { throw new Error("503"); };

  const rendu = await rejouerLesUtilitaires({
    projectId: "p1", enVigueur: memoire(), substitutions: new Map([["ddb-alt", "890 m"]]),
    appeler, dernierAppel
  });

  assert.deepEqual(rendu.recalculees, []);
  assert.deepEqual(rendu.refusees.map((r) => [r.sujet, r.refus]), [
    ["Profondeur hors gel", REFUS.INJOIGNABLE],
    ["Zone de neige", REFUS.INJOIGNABLE]
  ]);
});

test("sans appel conservé, on ne devine pas l'adresse à redemander", async () => {
  const rendu = await rejouerLesUtilitaires({
    projectId: "p1", enVigueur: memoire(), substitutions: new Map([["ddb-alt", "890 m"]]),
    appeler: async () => ({}), dernierAppel: async () => null
  });

  assert.deepEqual(rendu.recalculees, []);
  assert.deepEqual([...new Set(rendu.refusees.map((r) => r.refus))], [REFUS.SANS_APPEL]);
});

test("deux contraintes du même outil ne le redemandent qu'une fois", async () => {
  // Deux déductions peuvent venir du même outil. Relire son dernier appel deux
  // fois serait deux allers-retours pour la même réponse.
  const lectures = [];
  await rejouerLesUtilitaires({
    projectId: "p1",
    enVigueur: [
      dit("ddb-alt", "Altitude du site", "13 m"),
      neige("A1"),
      deduite({
        id: "snow2", sujet: "Zone de neige", valeur: "A1",
        utilitaire: "deduction_zone_neige_commune_V1", lectures: [["Altitude du site", "13"]]
      })
    ],
    substitutions: new Map([["ddb-alt", "890 m"]]),
    appeler: async () => ({ context_fact: { fact_value: { zone: "A1", inputs: { altitude: 890 }, reserves: [] } } }),
    dernierAppel: async (quoi) => { lectures.push(quoi.toolKey); return { input_payload: { code_insee: "44109" } }; }
  });

  assert.deepEqual(lectures, ["snow"]);
});

test("aucune variante, aucun appel", async () => {
  let appele = false;
  const rendu = await rejouerLesUtilitaires({
    projectId: "p1", enVigueur: memoire(), substitutions: new Map(),
    appeler: async () => { appele = true; return {}; }, dernierAppel
  });

  assert.deepEqual(rendu, { recalculees: [], refusees: [] });
  assert.equal(appele, false);
});
