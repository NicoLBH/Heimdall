import test from "node:test";
import assert from "node:assert/strict";

import {
  SIGNAL, cerveauDuProjet, dispositionDuCerveau, dispositionEnVolume, graineDe, liensDuRaisonnement,
  noeudsIsoles, ondeDepuis, phraseDuSignal, signauxDeLAudit, stratesDuGraphe
} from "./memoire-cerveau.js";
import { impactDe } from "./memoire-applications.js";

const at = "2026-01-10T09:00:00Z";

/** Une valeur du projet. Aucun nom réel nulle part. */
const dit = (id, sujet, valeur, nature = "donnee-de-base") => ({
  id, kind: "base-datum", subject_key: id, nature,
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur }
});

/** Une contrainte déduite par un utilitaire : le nœud opaque de référence. */
const deduite = (id, sujet, valeur, utilitaire) => ({
  id, kind: "site-constraint", subject_key: `site:${id}`, nature: "contrainte",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, derived: true, utilitaire }
});

/**
 * Une règle appliquée : elle produit une valeur, elle n'en est pas une.
 *
 * Ses conditions sont écrites pour **tenir** sur la mémoire d'essai. Une condition
 * posée au hasard fait déclarer la règle sans objet par l'audit, et l'on se
 * retrouve à tester une mémoire en dérive en croyant tester une mémoire saine.
 */
const regle = (sujet, valeur, lit = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`,
  status: "assumed", superseded_by: null, decided_at: at, statement: `${sujet} : ${valeur}`,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: {
      conditions: lit.map(([nom, attendue]) => ({ sujet: nom, operateur: "=", valeur: attendue })),
      sinon: "", sauf: []
    }
  }
});

const lecture = (de, vers) => ({ input_assertion_id: de, output_assertion_id: vers, input_rank: 1, zone: "" });

/** La chaîne complète : altitude → cote hors gel → fondations. Plus une branche. */
const memoire = () => [
  dit("alt", "Altitude du site", "13 m"),
  dit("cls", "Classement", "3e famille B"),
  deduite("gel", "Profondeur hors gel", "0.71 m", "deduction_profondeur_hors_gel_altitude_V1"),
  regle("Fondations profondes", "non exigées", [["Profondeur hors gel", "0.71 m"]]),
  dit("fond", "Fondations profondes", "non exigées", "constat"),
  regle("Degré CF", "CF 1 h", [["Classement", "3e famille B"]]),
  dit("cf", "Degré CF", "CF 1 h", "constat")
];

const lectures = () => [lecture("alt", "gel"), lecture("gel", "fond"), lecture("cls", "cf")];

/* ── Les strates ─────────────────────────────────────────────────────────── */

test("une strate est la distance au socle, par le plus long chemin", () => {
  // Un nœud qui attend deux entrées ne peut pas se calculer avant la dernière.
  // Le placer au plus tôt dessinerait un raisonnement qui ne tient pas.
  const { strates, profondeur } = stratesDuGraphe(
    ["a", "b", "c", "d"],
    [{ de: "a", vers: "b" }, { de: "b", vers: "c" }, { de: "a", vers: "c" }, { de: "c", vers: "d" }]
  );

  assert.deepEqual([...strates.entries()].sort(), [["a", 0], ["b", 1], ["c", 2], ["d", 3]]);
  assert.equal(profondeur, 3);
});

test("ce qui se lit en rond est nommé, jamais placé au hasard", () => {
  const { enRond, strates } = stratesDuGraphe(
    ["a", "b", "hors"],
    [{ de: "a", vers: "b" }, { de: "b", vers: "a" }]
  );

  assert.deepEqual([...enRond].sort(), ["a", "b"]);
  // Placés au bout, ensemble, et marqués : cacher l'erreur de modèle sous un
  // dessin propre serait pire que de la montrer.
  assert.equal(strates.get("a"), strates.get("b"));
  assert.equal(enRond.has("hors"), false);
});

test("un lien vers un nœud qu'on ne dessine pas ne déplace rien", () => {
  const { strates } = stratesDuGraphe(["a"], [{ de: "inconnu", vers: "a" }]);
  assert.equal(strates.get("a"), 0);
});

/* ── Les nœuds ───────────────────────────────────────────────────────────── */

test("les règles ne sont pas des nœuds : elles produisent des valeurs", () => {
  // Les dessiner ferait un nœud de plus par sujet, sans rien apprendre.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  assert.deepEqual(cerveau.noeuds.map((n) => n.id).sort(), ["alt", "cf", "cls", "fond", "gel"]);
});

test("chaque nœud porte sa nature, et le compte les sépare", () => {
  const cerveau = cerveauDuProjet(memoire(), lectures());

  assert.deepEqual(
    cerveau.noeuds.map((n) => [n.sujet, n.nature, n.strate]),
    [
      ["Altitude du site", "socle", 0],
      ["Classement", "socle", 0],
      ["Profondeur hors gel", "opaque", 1],
      ["Fondations profondes", "rejouable", 2],
      ["Degré CF", "rejouable", 1]
    ]
  );
  assert.equal(cerveau.profondeur, 2);
  assert.deepEqual(cerveau.compte, { socle: 2, rejouables: 2, opaques: 1, auServeur: 1, liens: 3 });
});

test("un nœud opaque dit s'il sait se rejouer au serveur", () => {
  // « On sait qu'il dépend » et « on sait le refaire » ne sont plus la même chose
  // depuis que les utilitaires se rejouent : l'écran doit pouvoir le montrer.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  const gel = cerveau.noeuds.find((n) => n.id === "gel");
  assert.equal(gel.rejouable, true);

  const orphelin = cerveauDuProjet(
    [deduite("x", "Zone de sismicité", "3", "outil_disparu_V9")], []
  ).noeuds[0];
  assert.equal(orphelin.nature, "opaque");
  assert.equal(orphelin.rejouable, false);
});

test("un nœud porte le compte de ce qui repose sur lui", () => {
  const cerveau = cerveauDuProjet(memoire(), [...lectures(), lecture("alt", "cf")]);
  assert.equal(cerveau.noeuds.find((n) => n.id === "alt").lectures, 2);
});

test("une affirmation remplacée n'est plus un nœud : elle n'est plus l'état", () => {
  const remplacee = { ...dit("vieux", "Altitude du site", "8 m"), superseded_by: "alt" };
  const cerveau = cerveauDuProjet([...memoire(), remplacee], lectures());
  assert.equal(cerveau.noeuds.some((n) => n.id === "vieux"), false);
});

/* ── D'où viennent les liens, et le dire ─────────────────────────────────── */

test("les lectures enregistrées priment, et l'écran sait le dire", () => {
  assert.equal(cerveauDuProjet(memoire(), lectures()).enregistres, true);

  // Sans elles, on retombe sur un rapprochement de noms : c'est vrai en moins
  // sûr, et une forme dessinée sur des ressemblances n'est pas la même chose.
  const sansLectures = cerveauDuProjet(memoire(), []);
  assert.equal(sansLectures.enregistres, false);
  assert.ok(sansLectures.liens.length > 0);
});

test("un lien lu plusieurs fois pèse plus lourd", () => {
  const { liens } = liensDuRaisonnement(memoire(), [lecture("alt", "gel"), lecture("alt", "gel")]);
  assert.deepEqual(liens, [{ de: "alt", vers: "gel", poids: 2 }]);
});

/* ── L'onde ──────────────────────────────────────────────────────────────── */

test("l'onde est la fonction de l'étude d'impact, sans une ligne de plus", () => {
  // C'est délibéré : si le dessin ment, l'étude d'impact ment aussi, et les deux
  // se corrigent ensemble. Un dessin avec sa propre vérité finirait par montrer
  // autre chose que ce que l'outil décide.
  const apps = lectures();
  assert.deepEqual(ondeDepuis("alt", apps), impactDe("alt", apps));
});

test("l'onde monte strate par strate depuis la valeur touchée", () => {
  const onde = ondeDepuis("alt", lectures());
  assert.deepEqual(onde.strates, [["gel"], ["fond"]]);
  assert.equal(onde.total, 2);
});

test("une valeur dont rien ne dépend n'allume rien, et c'est une information", () => {
  assert.deepEqual(ondeDepuis("cf", lectures()).strates, []);
});

/* ── La disposition ──────────────────────────────────────────────────────── */

test("les strates font les colonnes, du socle vers l'aval", () => {
  const places = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  const x = (id) => places.find((n) => n.id === id).x;

  assert.equal(x("alt"), 0);
  assert.equal(x("cls"), 0);
  assert.equal(x("fond"), 1);
  assert.ok(x("gel") > 0 && x("gel") < 1);
});

test("la disposition est la même d'une ouverture à l'autre", () => {
  // Un projet qui se redessinerait autrement à chaque fois ne se raconterait
  // pas : « le gros paquet en haut à droite » doit vouloir dire la même chose
  // demain.
  const premiere = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  const seconde = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  assert.deepEqual(premiere.map((n) => [n.id, n.x, n.y]), seconde.map((n) => [n.id, n.x, n.y]));
});

test("chaque nœud respire à son propre rythme", () => {
  // Sans déphasage, tout le cerveau battrait d'un seul bloc — ce qui ressemble à
  // un défaut d'affichage plutôt qu'à un organisme.
  const places = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  assert.equal(new Set(places.map((n) => n.phase)).size, places.length);
});

test("les nœuds tiennent dans le cadre, et le plus employé est au centre", () => {
  // Neuf valeurs du socle, dans la même colonne. `n0` est lue trois fois, les
  // autres jamais : c'est là que l'œil va, et c'est là que se trouve ce dont
  // tout dépend.
  const beaucoup = [...Array(9)].map((_, i) => dit(`n${i}`, `Sujet ${i}`, "v"));
  const aval = dit("aval", "Ce qui en découle", "v", "constat");
  const apps = [
    { ...lecture("n0", "aval"), input_rank: 1 },
    { ...lecture("n0", "aval"), input_rank: 2 },
    { ...lecture("n0", "aval"), input_rank: 3 }
  ];
  const places = dispositionDuCerveau(cerveauDuProjet([...beaucoup, aval], apps));

  for (const place of places) {
    assert.ok(place.y > 0 && place.y < 1, `${place.sujet} sort du cadre`);
  }

  const socle = places.filter((n) => n.strate === 0);
  const centre = socle.reduce((proche, n) => (Math.abs(n.y - 0.5) < Math.abs(proche.y - 0.5) ? n : proche));
  assert.equal(centre.id, "n0");
});

test("une mémoire vide ne dessine rien, et ne casse pas", () => {
  assert.deepEqual(dispositionDuCerveau(cerveauDuProjet([], [])), []);
  assert.deepEqual(dispositionDuCerveau(null), []);
});

test("une graine est stable, et deux sels ne donnent pas la même", () => {
  assert.equal(graineDe("abc", 7), graineDe("abc", 7));
  assert.notEqual(graineDe("abc", 7), graineDe("abc", 13));
  assert.ok(graineDe("abc") >= 0 && graineDe("abc") < 1);
});

/* ── Ce qu'aucun lien ne touche ──────────────────────────────────────────── */

test("un nœud qu'aucun lien ne touche est repéré, pas supprimé", () => {
  // Sur un vrai projet ils sont la majorité — trois cent onze affirmations pour
  // quatre-vingt-quatorze liens — et les dessiner tous fait un mur.
  const isole = dit("seul", "Donnée sans emploi", "42");
  const cerveau = cerveauDuProjet([...memoire(), isole], lectures());

  assert.deepEqual([...noeudsIsoles(cerveau)], ["seul"]);
  // Repéré, mais toujours là : c'est à l'écran de proposer de le remettre.
  assert.equal(cerveau.noeuds.some((n) => n.id === "seul"), true);
});

test("un nœud dont rien ne dépend mais qui dépend de quelque chose n'est pas isolé", () => {
  // « Isolé » veut dire qu'aucun lien ne le touche, dans aucun sens. Une
  // conclusion terminale est bien reliée au raisonnement.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  assert.equal(noeudsIsoles(cerveau).has("fond"), false);
});

/* ── Ce que l'audit signale ──────────────────────────────────────────────── */

test("un signal est ce que l'audit a jugé, jamais un jugement de l'écran", () => {
  // La règle conclut « CF 1 h 1/2 » sur une 4e famille ; le projet affirme
  // « CF 1 h ». C'est une dérive, et c'est l'audit qui le dit.
  const derive = [
    dit("cls", "Classement", "4e famille"),
    {
      id: "r-cf", subject_key: "regle:Degré CF", status: "assumed", superseded_by: null, decided_at: at,
      statement: "x",
      payload: {
        subject: "Degré CF", value: "CF 1 h", referentiel: true,
        regle: { conditions: [{ sujet: "Classement", operateur: "=", valeur: "3e famille B" }], sinon: "CF 1 h 1/2", sauf: [] }
      }
    },
    dit("cf", "Degré CF", "CF 1 h", "constat")
  ];

  const signaux = signauxDeLAudit(derive);
  assert.equal(signaux.get("cf"), SIGNAL.DERIVE);
  assert.match(phraseDuSignal(SIGNAL.DERIVE), /conclut autre chose/);
});

test("un calcul fait sur une entrée qui a changé est signalé, mais moins fort", () => {
  // Une dérive de règle prime : elle dit que la valeur affichée est fausse, là où
  // une entrée périmée dit seulement qu'elle ne vaut plus.
  const perimee = {
    ...deduite("gel", "Profondeur hors gel", "0.71 m", "deduction_profondeur_hors_gel_altitude_V1"),
    payload: {
      subject: "Profondeur hors gel", value: "0.71 m", derived: true,
      utilitaire: "deduction_profondeur_hors_gel_altitude_V1",
      lectures: [{ sujet: "Altitude du site", valeur: "13" }]
    }
  };

  const signaux = signauxDeLAudit([dit("alt", "Altitude du site", "890 m"), perimee]);
  assert.equal(signaux.get("gel"), SIGNAL.PERIMEE);
});

test("une mémoire qui tient ne signale rien", () => {
  assert.equal(signauxDeLAudit(memoire()).size, 0);
});

/* ── La disposition en volume ────────────────────────────────────────────── */

test("le socle est au centre, et les strates s'en éloignent", () => {
  const volume = dispositionEnVolume(cerveauDuProjet(memoire(), lectures()));
  const loin = (id) => {
    const n = volume.find((x) => x.id === id);
    return Math.hypot(n.x, n.y, n.z);
  };

  // Chaque strate est plus loin que la précédente : c'est ce que la vue montre.
  assert.ok(loin("alt") < loin("gel"), "le socle doit être plus près que la strate 1");
  assert.ok(loin("gel") < loin("fond"), "la strate 1 doit être plus près que la strate 2");
});

test("le nœud le plus employé du socle est le centre névralgique", () => {
  // La valeur dont le plus de choses dépendent, exactement au centre : on doit
  // pouvoir la montrer du doigt.
  const apps = [...lectures(), lecture("cls", "fond")];
  const volume = dispositionEnVolume(cerveauDuProjet(memoire(), apps));
  const centre = volume.find((n) => Math.hypot(n.x, n.y, n.z) === 0);

  assert.equal(centre.id, "cls");
});

test("aucun nœud ne tombe sur un pôle, où il se superposerait au centre", () => {
  // Le premier et le dernier point d'une spirale d'or tombent exactement sur les
  // pôles : alignés avec le centre, ils se confondent avec lui dès qu'on regarde
  // par le dessus, et une coquille de deux nœuds devenait un seul point.
  const deux = [dit("a", "A", "1"), dit("b", "B", "2"), dit("c", "C", "3")];
  const volume = dispositionEnVolume(cerveauDuProjet(deux, []));
  const surLaCoquille = volume.filter((n) => Math.hypot(n.x, n.y, n.z) > 0);

  assert.equal(surLaCoquille.length, 2);
  for (const noeud of surLaCoquille) {
    assert.ok(Math.hypot(noeud.x, noeud.z) > 0.01, `${noeud.sujet} est sur un pôle`);
  }
});

test("le volume est le même d'une ouverture à l'autre", () => {
  const premier = dispositionEnVolume(cerveauDuProjet(memoire(), lectures()));
  const second = dispositionEnVolume(cerveauDuProjet(memoire(), lectures()));
  assert.deepEqual(
    premier.map((n) => [n.id, n.x, n.y, n.z]),
    second.map((n) => [n.id, n.x, n.y, n.z])
  );
});

test("tout tient dans la boule de rayon un : c'est ce que l'écran suppose", () => {
  // La projection recule d'une distance qui dépasse ce rayon. Un nœud au-delà
  // passerait derrière l'œil et enverrait des coordonnées infinies.
  const beaucoup = [...Array(40)].map((_, i) => dit(`n${i}`, `Sujet ${i}`, "v"));
  for (const noeud of dispositionEnVolume(cerveauDuProjet(beaucoup, []))) {
    assert.ok(Math.hypot(noeud.x, noeud.y, noeud.z) <= 1.0001, noeud.sujet);
  }
});

test("une mémoire vide ne remplit aucun volume, et ne casse pas", () => {
  assert.deepEqual(dispositionEnVolume(cerveauDuProjet([], [])), []);
  assert.deepEqual(dispositionEnVolume(null), []);
});
