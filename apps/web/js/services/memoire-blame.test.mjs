import test from "node:test";
import assert from "node:assert/strict";

import {
  fichiersDeLaMemoire, dossiersDeLaMemoire, blameDeLaLigne, histoireDeLaLigne,
  chaleurDeLaLigne, bornesDuFichier, dernierVersementDe, versementsDeLaMemoire,
  contributeursDuFichier, PARTS_DANCIENNETE
} from "./memoire-blame.js";

const assertion = (id, cle, valeur, extra = {}) => ({
  id, subject_key: cle, kind: "base-datum", nature: "contrainte", domain: "incendie",
  status: "assumed", payload: { subject: cle, value: valeur },
  proposition_id: "p1", proposition_number: 4, decided_at: "2026-09-01T10:00:00Z",
  decided_by: "u1", superseded_by: null, supersedes: null, ...extra
});

test("un fichier ne contient que ce qui vaut aujourd'hui", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a0", "degre-cf", "CF 1/2 h", { superseded_by: "a1" }),
    assertion("a1", "degre-cf", "CF 1 h", { supersedes: "a0" }),
    assertion("a2", "famille", "3e famille B")
  ]);

  assert.equal(fichiers.length, 1);
  assert.equal(fichiers[0].fichier, "memoire/incendie.ctr");
  assert.deepEqual(fichiers[0].lignes.map((l) => l.payload.value), ["CF 1 h", "3e famille B"]);
});

test("ce qui a été écarté a sa section, il ne se lit pas comme acquis", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a1", "degre-cf", "CF 1 h"),
    assertion("a2", "desenfumage", "naturel", { status: "rejected" })
  ]);

  assert.deepEqual(fichiers[0].lignes.map((l) => l.subject_key), ["degre-cf"]);
  assert.deepEqual(fichiers[0].ecartees.map((l) => l.subject_key), ["desenfumage"]);
});

test("ce qui est observé est transversal, ce qui est déduit est par domaine", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a1", "zone-neige", "A2", { nature: "donnee-de-base", domain: "structure" }),
    assertion("a2", "hors-gel", "0,80 m", { nature: "contrainte", domain: "structure" })
  ]);

  // Une mesure appartient au bâtiment, pas à une discipline : elle porte le nom
  // de sa nature. Une contrainte vient d'un corpus : elle porte son domaine.
  assert.deepEqual(fichiers.map((f) => f.fichier).sort(),
    ["memoire/donnees-de-base.ddb", "memoire/structure.ctr"]);
});

test("une affirmation qui vaut pour deux zones ouvre les deux sections du même fichier", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a1", "degre-cf", "CF 1 h", {
      nature: "contrainte", domain: "incendie",
      payload: { subject: "Degré coupe-feu", value: "CF 1 h", zones: ["Escalier A", "Escalier B"] }
    }),
    assertion("a2", "champ", "dans le champ", {
      nature: "contrainte", domain: "incendie",
      payload: { subject: "Champ d'application", value: "dans le champ" }
    })
  ]);

  // Un seul fichier : la zone est une section, pas un répertoire.
  assert.deepEqual(fichiers.map((f) => f.fichier), ["memoire/incendie.ctr"]);

  // Ce qui vaut partout se lit en premier.
  const sections = fichiers[0].sections;
  assert.deepEqual(sections.map((s) => s.zone), ["Toutes zones", "Escalier A", "Escalier B"]);
  // La même affirmation, vue de deux endroits : même identifiant des deux côtés.
  assert.deepEqual(sections[1].lignes.map((l) => l.id), ["a1"]);
  assert.deepEqual(sections[2].lignes.map((l) => l.id), ["a1"]);
});

test("un dossier vide ne s'affiche pas : un projet neuf n'a rien perdu", () => {
  assert.deepEqual(dossiersDeLaMemoire([]), []);
  const dossiers = dossiersDeLaMemoire([assertion("a1", "degre-cf", "CF 1 h")]);
  assert.deepEqual(dossiers.map((d) => d.nom), ["Incendie"]);
  assert.equal(dossiers[0].lignes, 1);
});

test("un dossier est ce qui vit dans Mémoire, jamais Mémoire elle-même", () => {
  // Le premier morceau du chemin est la racine de la branche. Grouper dessus
  // rendait un unique dossier « Mémoire » dans « Mémoire », et les fichiers
  // devenaient inatteignables.
  const dossiers = dossiersDeLaMemoire([
    assertion("a1", "degre-cf", "CF 1 h"),
    assertion("a2", "zone-neige", "A2", { nature: "donnee-de-base", domain: "structure" }),
    assertion("a3", "portance", "0,2 MPa", { nature: "hypothese", domain: "structure" })
  ]);

  assert.deepEqual(dossiers.map((d) => d.nom).sort(), ["Données de base", "Hypothèses", "Incendie"]);
  assert.equal(dossiers.some((d) => d.nom === "Mémoire"), false);
});

test("le blâme d'une ligne mène à la proposition qui l'a versée", () => {
  const blame = blameDeLaLigne(assertion("a1", "degre-cf", "CF 1 h"), new Map([["u1", "Nicolas LE BIHAN"]]));

  assert.equal(blame.intitule, "#P4");
  assert.equal(blame.propositionId, "p1");
  assert.equal(blame.qui, "Nicolas LE BIHAN");
});

test("une ligne sans proposition n'est pas une ligne sans origine", () => {
  const blame = blameDeLaLigne(assertion("a1", "x", "y", { proposition_id: null, proposition_number: null }));
  assert.equal(blame.intitule, "déclarée à la main");
  assert.equal(blame.propositionId, null);
});

test("l'histoire d'une ligne remonte par les remplacements, pas par la date", () => {
  const memoire = [
    assertion("a0", "degre-cf", "CF 1/4 h", { superseded_by: "a1" }),
    assertion("a1", "degre-cf", "CF 1/2 h", { supersedes: "a0", superseded_by: "a2" }),
    assertion("a2", "degre-cf", "CF 1 h", { supersedes: "a1" })
  ];

  const histoire = histoireDeLaLigne(memoire, memoire[2]);
  assert.deepEqual(histoire.map((l) => l.payload.value), ["CF 1 h", "CF 1/2 h", "CF 1/4 h"]);
});

test("une histoire qui boucle sur elle-même s'arrête", () => {
  const boucle = [
    assertion("a1", "x", "1", { supersedes: "a2" }),
    assertion("a2", "x", "2", { supersedes: "a1" })
  ];
  assert.equal(histoireDeLaLigne(boucle, boucle[0]).length, 2);
});

test("la marge se colore par ancienneté, du plus ancien au plus récent", () => {
  const lignes = [
    assertion("a1", "x", "1", { decided_at: "2026-01-01T00:00:00Z" }),
    assertion("a2", "y", "2", { decided_at: "2026-09-01T00:00:00Z" })
  ];
  const bornes = bornesDuFichier(lignes);

  assert.equal(chaleurDeLaLigne(lignes[0], bornes), 0);
  assert.equal(chaleurDeLaLigne(lignes[1], bornes), PARTS_DANCIENNETE - 1);

  // Dix degrés, et le milieu tombe au milieu : c'est ce qui rend l'échelle
  // lisible plutôt que décorative.
  const milieu = assertion("a3", "z", "3", { decided_at: "2026-05-02T00:00:00Z" });
  assert.equal(chaleurDeLaLigne(milieu, bornes), 4);
});

test("un fichier d'une seule ligne ne se colore pas à moitié", () => {
  const seule = assertion("a1", "x", "1");
  assert.equal(chaleurDeLaLigne(seule, bornesDuFichier([seule])), PARTS_DANCIENNETE - 1);
});

test("les contributeurs d'un fichier se comptent par identifiant, du plus récent", () => {
  const lignes = [
    assertion("a1", "x", "1", { decided_by: "u1", decided_at: "2026-01-01T00:00:00Z" }),
    assertion("a2", "y", "2", { decided_by: "u2", decided_at: "2026-09-01T00:00:00Z" }),
    assertion("a3", "z", "3", { decided_by: "u1", decided_at: "2026-05-01T00:00:00Z" })
  ];
  const gens = contributeursDuFichier(lignes, new Map([["u1", "Nicolas LE BIHAN"]]));

  assert.deepEqual(gens.map((qui) => qui.id), ["u2", "u1"]);
  // Un nom qu'on ignore ne fait pas disparaître la personne.
  assert.deepEqual(gens.map((qui) => qui.nom), ["auteur inconnu", "Nicolas LE BIHAN"]);
});

test("les versements se comptent en actes, pas en lignes", () => {
  const { versements, plusRecent } = versementsDeLaMemoire([
    { proposition_id: "p1", decided_at: "2026-01-10T00:00:00Z" },
    { proposition_id: "p1", decided_at: "2026-01-10T00:00:00Z" },
    { proposition_id: "p2", decided_at: "2026-03-02T00:00:00Z" },
    { id: "a-la-main", decided_at: "2026-02-01T00:00:00Z" }
  ]);

  assert.equal(versements, 3);
  assert.equal(plusRecent, "2026-03-02T00:00:00.000Z");
});

test("le dernier versement prend le titre de la proposition pour message", () => {
  const dernier = dernierVersementDe(
    [
      { proposition_id: "p1", proposition_number: 7, decided_at: "2026-01-10T00:00:00Z", decided_by: "u1" },
      { proposition_id: "p2", proposition_number: 8, decided_at: "2026-03-02T00:00:00Z", decided_by: "u2" }
    ],
    {
      auteurs: new Map([["u2", "Camille Roux"]]),
      propositions: new Map([["p2", { id: "p2", title: "Contraintes incendie du bâtiment A" }]])
    }
  );

  assert.equal(dernier.intitule, "#P8");
  assert.equal(dernier.qui, "Camille Roux");
  assert.equal(dernier.message, "Contraintes incendie du bâtiment A");
});
