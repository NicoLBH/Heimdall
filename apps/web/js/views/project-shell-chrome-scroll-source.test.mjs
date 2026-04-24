import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chromePath = path.resolve(__dirname, "./project-shell-chrome.js");
const chromeSource = fs.readFileSync(chromePath, "utf8");

test("syncCompactState utilise document/window quand aucune source locale n'est active", () => {
  assert.match(chromeSource, /const scrollTop = activeScrollSourceEl\s*\?\s*getScrollTopFromElement\(activeScrollSourceEl\)\s*:\s*getDocumentScrollTop\(\);/);
});

test("syncCompactState utilise la source locale quand elle est active", () => {
  assert.match(chromeSource, /const scrollTop = activeScrollSourceEl\s*\?\s*getScrollTopFromElement\(activeScrollSourceEl\)/);
});

test("clearProjectActiveScrollSource revient à document/window", () => {
  assert.match(chromeSource, /export function clearProjectActiveScrollSource\(el = null\) \{[\s\S]*?shellState\.activeScrollSourceEl = null;[\s\S]*?shellState\.activeScrollSourceResolver = null;[\s\S]*?syncCompactState\(\);/);
});

test("mountProjectShellChrome applique immédiatement le contexte route--project", () => {
  assert.match(chromeSource, /export function mountProjectShellChrome\(\{ projectId, tab \}\) \{[\s\S]*?refreshProjectShellChromeRefs\(\);[\s\S]*?ensureProjectRouteClass\(\);/);
});

test("applyCompactState garantit route--project avant le early return", () => {
  assert.match(chromeSource, /function applyCompactState\(isCompact\) \{[\s\S]*?ensureProjectRouteClass\(\);[\s\S]*?if \(!didChange\) \{/);
});

test("instrumentation project scroll policy loggue body, scrollingElement et appLayout", () => {
  assert.match(chromeSource, /bodyClassName:\s*document\.body\?\.className\s*\|\|\s*""/);
  assert.match(chromeSource, /scrollingElementTag:\s*scrollingElement\?\.tagName\s*\|\|\s*null/);
  assert.match(chromeSource, /appLayout:\s*readAppLayout\(\)/);
  assert.match(chromeSource, /function readAppLayout\(\)\s*\{[\s\S]*?position:[\s\S]*?overflow:[\s\S]*?scrollTop:[\s\S]*?scrollHeight:[\s\S]*?clientHeight:/);
});
