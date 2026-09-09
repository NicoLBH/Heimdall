/**
 * Un ZIP écrit à la main : il faut qu'un vrai outil sache l'ouvrir.
 *
 * Et « un vrai outil » ne suffit pas : il faut qu'il l'ouvre **partout**. La
 * machine qui construit le site tourne en `C.UTF-8`, et c'est là — nulle part
 * ailleurs — que « Mémoire » ressortait « M├йmoire ». On appelle donc `unzip`
 * dans cette langue-là, exprès.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
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

/** Le répertoire central, lu depuis les octets : c'est là que tout se joue. */
function entreesDuRepertoire(octets) {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const entrees = [];

  for (let place = 0; place + 46 <= octets.length; place += 1) {
    if (vue.getUint32(place, true) !== 0x02014B50) continue;
    entrees.push({
      systeme: vue.getUint16(place + 4, true) >>> 8,
      drapeaux: vue.getUint16(place + 8, true),
      mode: (vue.getUint32(place + 38, true) >>> 16) & 0o7777
    });
  }
  return entrees;
}

test("chaque entrée se dit venue d'Unix, avec des droits de lecture", () => {
  // Sans cela, `unzip` prend le nom pour une page de code MS-DOS et le traduit :
  // l'archive s'ouvre, et « Mémoire » n'existe plus. Le drapeau UTF-8 seul ne
  // l'en empêche pas. Le mode, lui, décide si un fichier extrait se lit : déclarer
  // Unix sans donner de mode revient à extraire des fichiers en `0000`.
  const entrees = entreesDuRepertoire(ecrireUnZip([
    { chemin: "Mémoire/structure.ref", contenu: "a\n" },
    { chemin: "Mémoire/Structure/structure.ctr", contenu: "b\n" }
  ]));

  assert.equal(entrees.length, 2);
  for (const entree of entrees) {
    assert.equal(entree.systeme, 3, "système d'origine : Unix");
    assert.equal(entree.drapeaux & 0x0800, 0x0800, "le nom est en UTF-8");
    assert.equal(entree.mode, 0o644, "le fichier extrait se lit");
  }
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
    execFileSync("unzip", ["-qq", archive, "-d", join(dossier, "sorti")], {
      // La langue de la machine de construction, celle qui faisait apparaître le
      // défaut. Un test qui n'appelle `unzip` que dans sa propre langue ne
      // protège que la machine où on l'a écrit.
      env: { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" }
    });
  } catch (erreur) {
    if (erreur?.code === "ENOENT") return; // pas d'`unzip` ici : on ne conclut rien
    // `unzip` rend 1 pour un simple avertissement, en ayant tout extrait. On ne
    // s'arrête que sur un vrai échec ; le reste du test dira si quelque chose
    // manque.
    if (erreur?.status !== 1) throw erreur;
  }

  for (const fichier of fichiers) {
    const sorti = join(dossier, "sorti", fichier.chemin);
    assert.equal(readFileSync(sorti, "utf8"), fichier.contenu, fichier.chemin);
    assert.ok(statSync(sorti).mode & 0o444, `${fichier.chemin} : extrait illisible`);
  }
  assert.deepEqual(readdirSync(join(dossier, "sorti")), ["Mémoire"]);
});
