import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveSelectionAfterSubjectsLoad,
  shouldIgnoreSubjectsLoadApply
} from "./project-subjects-selection-concurrency.js";

const SUBJECT_A = "11111111-1111-4111-8111-111111111111";
const SUBJECT_B = "22222222-2222-4222-8222-222222222222";
const SUBJECT_C = "33333333-3333-4333-8333-333333333333";
const SITUATION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SITUATION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SITUATION_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function buildResult(subjectIds = []) {
  const subjectsById = Object.fromEntries(subjectIds.map((id) => [id, { id, situation_id: id === SUBJECT_A ? SITUATION_A : id === SUBJECT_B ? SITUATION_B : SITUATION_C }]));
  return {
    subjects: subjectIds.map((id) => ({ id })),
    subjectsById,
    situationsById: {
      [SITUATION_A]: { id: SITUATION_A },
      [SITUATION_B]: { id: SITUATION_B },
      [SITUATION_C]: { id: SITUATION_C }
    }
  };
}

test("TEST 1: conserve la sélection utilisateur plus récente après la fin du load", () => {
  const resolved = resolveSelectionAfterSubjectsLoad({
    result: buildResult([SUBJECT_A, SUBJECT_B]),
    currentSelectedSubjectId: SUBJECT_B,
    currentSelectionRevision: 8,
    loadStartSelectionRevision: 7,
    snapshotSelectedSubjectId: SUBJECT_A
  });
  assert.equal(resolved.selectedSubjectId, SUBJECT_B);
  assert.equal(resolved.selectedSituationId, SITUATION_B);
  assert.equal(resolved.hasNewerUserSelection, true);
});

test("TEST 2: ignore un load périmé quand une requête plus récente existe", () => {
  const decision = shouldIgnoreSubjectsLoadApply({
    loadRequestId: 1,
    latestLoadRequestId: 2,
    loadProjectScopeId: "project-a",
    currentProjectScopeId: "project-a"
  });
  assert.equal(decision.ignore, true);
  assert.equal(decision.reason, "newer-request-exists");
});

test("TEST 3: ignore le résultat si le projet a changé pendant le load", () => {
  const decision = shouldIgnoreSubjectsLoadApply({
    loadRequestId: 2,
    latestLoadRequestId: 2,
    loadProjectScopeId: "project-a",
    currentProjectScopeId: "project-b"
  });
  assert.equal(decision.ignore, true);
  assert.equal(decision.reason, "project-changed-before-apply");
});

test("TEST 4: fallback sur un sujet valide et situation cohérente si la sélection n'existe plus", () => {
  const resolved = resolveSelectionAfterSubjectsLoad({
    result: buildResult([SUBJECT_C]),
    currentSelectedSubjectId: SUBJECT_A,
    currentSelectionRevision: 5,
    loadStartSelectionRevision: 5,
    snapshotSelectedSubjectId: SUBJECT_A
  });
  assert.equal(resolved.selectedSubjectId, SUBJECT_C);
  assert.equal(resolved.selectedSituationId, SITUATION_C);
  assert.equal(resolved.selectionReason, "fallback-first-subject");
});
