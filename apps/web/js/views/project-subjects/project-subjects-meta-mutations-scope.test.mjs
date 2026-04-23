import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-actions.js"), "utf8");

test("les toggles méta utilisent une garde centralisée pour la cible draft", () => {
  assert.match(actionsSource, /function isDraftMetaTarget\(subjectId\) \{/);
  assert.match(actionsSource, /if \(isDraftMetaTarget\(subjectKey\)\) \{/);
});

test("toggleSubjectAssignee n'écrit pas dans les maps persistantes pour un draft", () => {
  assert.match(
    actionsSource,
    /setSubjectAssigneeIds\(subjectKey, nextIds\);\s*if \(isDraftMetaTarget\(subjectKey\)\) \{[\s\S]*?return true;\s*\}\s*syncSubjectAssigneeMap\(subjectKey, nextIds\);/
  );
});

test("toggleSubjectSituation n'écrit pas dans les maps persistantes pour un draft", () => {
  assert.match(
    actionsSource,
    /setSubjectSituationIds\(subjectKey, nextIds\);\s*if \(!isDraftMetaTarget\(subjectKey\)\) \{\s*syncSubjectSituationMaps\(subjectKey, situationKey, !wasLinked\);\s*\}/
  );
  assert.match(actionsSource, /if \(isDraftMetaTarget\(subjectKey\)\) \{\s*return true;\s*\}/);
});

test("toggleSubjectObjective n'écrit pas dans les maps persistantes pour un draft", () => {
  assert.match(
    actionsSource,
    /setSubjectObjectiveIds\(subjectKey, nextIds\);\s*if \(!isDraftMetaTarget\(subjectKey\)\) \{\s*removedObjectiveIds\.forEach\(\(id\) => syncSubjectObjectiveMaps\(subjectKey, id, false\)\);\s*addedObjectiveIds\.forEach\(\(id\) => syncSubjectObjectiveMaps\(subjectKey, id, true\)\);\s*\}/
  );
  assert.match(actionsSource, /if \(isDraftMetaTarget\(subjectKey\)\) \{\s*return true;\s*\}/);
});
