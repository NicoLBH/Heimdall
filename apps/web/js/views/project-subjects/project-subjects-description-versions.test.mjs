import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsDescription } from "./project-subjects-description.js";

test("description versions: un rerender pendant le chargement ne bloque pas isLoading", async () => {
  const store = {
    user: { id: "user-1", avatar: "" },
    projectForm: { collaborators: [] },
    projectSubjectsView: {},
    situationsView: {}
  };

  const runBucketState = { descriptions: { sujet: {}, situation: {} } };
  let deferredResolve;
  let loadCalls = 0;

  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => {
      store.projectSubjectsView ||= {};
    },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: () => "",
    mdToHtml: (value) => String(value || ""),
    fmtTs: () => "20/04/2026",
    nowIso: () => new Date().toISOString(),
    setOverlayChromeOpenState: () => {},
    SVG_AVATAR_HUMAN: "",
    renderCommentComposer: () => "",
    getRunBucket: () => ({ bucket: runBucketState }),
    persistRunBucket: (updater) => updater(runBucketState),
    getSelectionEntityType: (type) => type,
    getEntityByType: (type, id) => ({ id, title: `${type}-${id}`, raw: { description: "Description" } }),
    getEntityReviewMeta: () => ({}),
    setEntityReviewMeta: () => {},
    currentDecisionTarget: () => ({ type: "sujet", id: "subject-1", item: { id: "subject-1" } }),
    rerenderScope: () => {
      // Simule un rerender qui relit l'état au milieu du await.
      api.closeDescriptionVersionsDropdown();
    },
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async () => {
      loadCalls += 1;
      return await new Promise((resolve) => {
        deferredResolve = resolve;
      });
    }
  });

  api.toggleDescriptionVersionsDropdown({});
  deferredResolve?.([
    {
      id: "v1",
      actor_user_id: "user-1",
      actor_person_id: "person-1",
      actor_first_name: "Ada",
      actor_last_name: "Lovelace",
      actor_name: "Ada Lovelace",
      description_markdown: "Version 1",
      created_at: new Date(Date.now() - 60_000).toISOString()
    }
  ]);

  await new Promise((resolve) => setTimeout(resolve, 0));

  const versionsUi = store.projectSubjectsView.descriptionVersionsUi;
  assert.equal(loadCalls, 1);
  assert.equal(versionsUi.isLoading, false);
  assert.equal(versionsUi.versions.length, 1);

  api.toggleDescriptionVersionsDropdown({});
  const html = api.renderDescriptionCard({
    type: "sujet",
    item: { id: "subject-1", title: "Sujet", raw: { description: "Description" } }
  });

  assert.match(html, /Versions \(1\)/);
  assert.doesNotMatch(html, /Chargement des versions/);
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /il y a/);
});
