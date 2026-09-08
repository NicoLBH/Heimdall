import test from "node:test";
import assert from "node:assert/strict";

import {
  estLAltitude, litLAltitude, pourquoiPasRelue, relecturesConnues, relireLaContrainte, SANS_ENTREE
} from "./variante-utilitaires.js";

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

/** Une donnée de base ordinaire. */
const dit = (sujet, valeur) => ({
  id: `a-${sujet}`, kind: "base-datum", nature: "donnee-de-base", subject_key: sujet,
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur, declared: true }
});

test("l'altitude se reconnaît au mot, jamais au-delà", () => {
  assert.equal(estLAltitude(altitude("490 m")), true);
  assert.equal(estLAltitude(dit("altitude du terrain", "490 m")), true);
  // Un sujet qui ne porte pas le mot n'est pas une altitude : deviner ici
  // reviendrait à faire varier autre chose que ce qu'on a annoncé.
  assert.equal(estLAltitude(dit("Commune", "Grenoble")), false);
  // Une contrainte déduite n'est pas une donnée de base, même si elle en parle.
  assert.equal(estLAltitude(horsGel("0.99 m", 490)), false);
});

test("la profondeur hors gel se relit sans la table départementale", () => {
  // H = H0 + (altitude − 150) / 4000. H0 est le même des deux côtés : il se
  // simplifie, et l'écart suffit. Rien du serveur ne descend au navigateur.
  const relue = relireLaContrainte(horsGel("0.99 m", 490), 890);
  assert.equal(relue.avant, "0.99 m");
  assert.equal(relue.apres, "1.09 m");
  assert.equal(relue.valeurABouge, true);
  assert.equal(relue.suppose, false);
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

test("une version qu'on ne sait pas relire n'est jamais recalculée, et se nomme", () => {
  // Mieux vaut « je ne sais pas » qu'un chiffre rendu d'après la mauvaise loi :
  // c'est le seul garde-fou qui empêche de présenter du propagé pour du calculé.
  const v2 = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0,99 m", alt: 490,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V2"
  });
  assert.equal(relireLaContrainte(v2, 890), null);
  assert.match(pourquoiPasRelue(v2), /deduction_profondeur_hors_gel_altitude_V2/);
  // Elle reste **concernée** : le calcul a conservé l'altitude sur laquelle il a
  // été fait, et ne pas savoir la rejouer n'autorise pas à l'oublier.
  assert.equal(litLAltitude(v2), true);
});

test("une contrainte versée sans ses entrées reste concernée", () => {
  // Le vrai défaut du premier jet : une cote hors gel écrite avant qu'on
  // conserve les entrées tombait dans « inchangé », comptée comme sans rapport
  // avec l'altitude. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien.
  const sansEntrees = {
    ...horsGel("0.99 m", 490),
    payload: { ...horsGel("0.99 m", 490).payload, inputs: null }
  };
  assert.equal(litLAltitude(sansEntrees), true);
  assert.equal(relireLaContrainte(sansEntrees, 890), null);
  assert.equal(pourquoiPasRelue(sansEntrees), SANS_ENTREE);
  // Et elle se relit dès qu'on accepte de supposer son altitude de départ.
  const supposee = relireLaContrainte(sansEntrees, 890, { supposerDepuis: 490 });
  assert.equal(supposee.apres, "1.09 m");
  assert.equal(supposee.suppose, true);
});

test("un utilitaire qui ne déclare pas lire l'altitude n'est pas concerné", () => {
  const autre = deduite({
    id: "seismic", sujet: "Zone de sismicité", valeur: "3", alt: undefined,
    utilitaire: "deduction_zone_sismique_georisques_V1"
  });
  autre.payload.inputs = null;
  assert.equal(litLAltitude(autre), false);
});

test("c'est la déclaration de l'utilitaire qui dit qu'il lit l'altitude", () => {
  // Une liste de lignées tenue à la main vivait ici. Elle disait la même chose,
  // en moins fiable et en un endroit de plus : le catalogue la porte maintenant,
  // par version, dans le fichier de l'utilitaire.
  const sansEntrees = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0.71 m", alt: undefined,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V1"
  });
  sansEntrees.payload.inputs = null;

  assert.equal(litLAltitude(sansEntrees), true);
});

test("la déclaration portée par la contrainte prime sur celle du catalogue", () => {
  const portee = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0.71 m", alt: undefined,
    utilitaire: "outil_disparu_V9"
  });
  portee.payload.inputs = null;
  portee.payload.lectures = [{ sujet: "Altitude du terrain", valeur: "13" }];

  // Le sujet varié est celui que **ce projet** écrit, pas un libellé canonique :
  // comparer à « Altitude du site » manquerait « Altitude du terrain ».
  assert.equal(litLAltitude(portee, "Altitude du terrain"), true);
  assert.equal(litLAltitude(portee, "Altitude du site"), false);
});

test("les relectures ne se déclenchent que si l'altitude est ce qui varie", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490), dit("Commune", "Grenoble")];

  // Une autre valeur qui varie : ce fichier n'a rien à en dire, et le dit.
  const muet = relecturesConnues({
    enVigueur: memoire, substitutions: new Map([["a-Commune", "Chamonix"]])
  });
  assert.deepEqual(muet, { concerne: false, recalculees: [], refusees: [], supposables: 0 });

  const parle = relecturesConnues({
    enVigueur: memoire, substitutions: new Map([["ddb-altitude", "890 m"]])
  });
  assert.equal(parle.concerne, true);
  assert.deepEqual(parle.recalculees.map((l) => [l.sujet, l.apres]), [["Profondeur hors gel", "1.09 m"]]);
});

test("supposer l'altitude de départ se demande, ne se prend jamais", () => {
  const sansEntrees = {
    ...horsGel("0.71 m", 13),
    payload: { ...horsGel("0.71 m", 13).payload, inputs: null }
  };
  const memoire = [altitude("13 m"), sansEntrees];
  const substitutions = new Map([["ddb-altitude", "890 m"]]);

  const stricte = relecturesConnues({ enVigueur: memoire, substitutions });
  assert.equal(stricte.recalculees.length, 0);
  assert.equal(stricte.refusees.length, 1);
  assert.equal(stricte.supposables, 1);

  const avecGeste = relecturesConnues({ enVigueur: memoire, substitutions, supposer: true });
  assert.equal(avecGeste.recalculees[0].suppose, true);
  assert.equal(avecGeste.recalculees[0].altitudeDepart, 13);
  assert.equal(avecGeste.recalculees[0].apres, "0.93 m");
  assert.deepEqual(avecGeste.refusees, []);
});

test("une altitude qui ne se lit pas comme un nombre n'enclenche rien", () => {
  // `Number("")` vaut zéro, et une altitude à zéro se calcule sans broncher
  // jusqu'à une cote de fondation fausse : mieux vaut ne rien relire.
  const rendu = relecturesConnues({
    enVigueur: [altitude("490 m"), horsGel("0.99 m", 490)],
    substitutions: new Map([["ddb-altitude", "à confirmer"]])
  });
  assert.equal(rendu.concerne, false);
});
