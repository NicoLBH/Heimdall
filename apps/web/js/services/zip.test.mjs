/**
 * Un ZIP écrit à la main : il faut qu'un vrai outil sache l'ouvrir.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ecrireUnZip, crc32 } from "./zip.js";

test("le CRC-32 est celui que le format attend", () => {
  // La valeur de référence de « 123456789 », citée par toutes les tables.
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xCBF43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("une archive vide reste une archive valide", () => {
  const octets = ecrireUnZip([]);
  // Signature de fin de répertoire central, et rien d'autre.
  assert.equal(octets.length, 22);
  assert.deepEqual([...octets.slice(0, 4)], [0x50, 0x4B, 0x05, 0x06]);
});

test("un chemin vide ne fait pas d'entrée", () => {
  assert.equal(ecrireUnZip([{ chemin: "   ", contenu: "x" }]).length, 22);
});

test("`unzip` relit ce qu'on a écrit, accents et extensions compris", () => {
  // C'est le seul test qui compte : un format écrit à la main ne vaut que si un
  // outil qu'on n'a pas écrit sait l'ouvrir.
  const fichiers = [
    { chemin: "Mémoire/structure.ref", contenu: "fonction Prédimensionnement(batiment-a) {\n}\n" },
    { chemin: "Mémoire/Structure/structure.ctr", contenu: "Profondeur hors gel = 0,47 m\n" },
    { chemin: "Mémoire/variables-du-projet.ref", contenu: "const Altitude du site = {\n};\n" }
  ];

  const dossier = mkdtempSync(join(tmpdir(), "mdall-zip-"));
  const archive = join(dossier, "memoire.zip");
  writeFileSync(archive, ecrireUnZip(fichiers));

  try {
    execFileSync("unzip", ["-qq", archive, "-d", join(dossier, "sorti")]);
  } catch (erreur) {
    if (erreur?.code === "ENOENT") return; // pas d'`unzip` ici : on ne conclut rien
    throw erreur;
  }

  for (const fichier of fichiers) {
    const relu = readFileSync(join(dossier, "sorti", fichier.chemin), "utf8");
    assert.equal(relu, fichier.contenu, fichier.chemin);
  }
  assert.deepEqual(readdirSync(join(dossier, "sorti")), ["Mémoire"]);
});
