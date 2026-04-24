import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const detailPath = path.resolve(__dirname, "./project-subject-detail.js");
const drilldownPath = path.resolve(__dirname, "./project-subject-drilldown.js");
const detailSource = fs.readFileSync(detailPath, "utf8");
const drilldownSource = fs.readFileSync(drilldownPath, "utf8");

test("le détail principal reste bindé au scroll document/window", () => {
  assert.match(detailSource, /bindDetailsScroll\(document\);/);
});

test("le drilldown reste bindé au scroll interne du panel", () => {
  assert.match(drilldownSource, /bindDetailsScroll\(panel\);/);
});
