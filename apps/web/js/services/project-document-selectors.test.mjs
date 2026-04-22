import test from "node:test";
import assert from "node:assert/strict";

import { getSelectionDocumentRefs } from "./project-document-selectors.js";
import { store } from "../store.js";

function seedProjectDocuments(items = []) {
  store.projectDocuments = {
    items,
    activeDocumentId: null,
    lastAnalysisDocumentIds: []
  };
}

test("document refs: document_id seul ne doit produire aucune référence UI", () => {
  seedProjectDocuments([
    { id: "doc-1", name: "Document 1", phaseCode: "APS", phaseLabel: "Avant Projet Sommaire", documentKind: "user_upload" }
  ]);

  const refs = getSelectionDocumentRefs({
    item: {
      id: "subject-1",
      document_id: "doc-1",
      document_ref_ids: [],
      raw: { document_ref_ids: [] }
    }
  });

  assert.equal(refs.length, 0);
});

test("document refs: les document_ref_ids valides sont affichées", () => {
  seedProjectDocuments([
    { id: "doc-1", name: "Document 1", phaseCode: "APS", phaseLabel: "Avant Projet Sommaire", documentKind: "user_upload" },
    { id: "doc-2", name: "Document 2", phaseCode: "APD", phaseLabel: "Avant Projet Définitif", documentKind: "user_upload" }
  ]);

  const refs = getSelectionDocumentRefs({
    item: {
      id: "subject-2",
      document_id: "doc-1",
      document_ref_ids: ["doc-2", "doc-1"],
      raw: { document_ref_ids: ["doc-2"] }
    }
  });

  assert.equal(refs.length, 2);
  assert.deepEqual(refs.map((ref) => ref.id), ["doc-2", "doc-1"]);
  assert.equal(refs.find((ref) => ref.id === "doc-1")?.name, "Document 1");
  assert.equal(refs.find((ref) => ref.id === "doc-2")?.name, "Document 2");
});

test("document refs: sujet manuel système sans document_ref_ids ne montre aucune référence", () => {
  seedProjectDocuments([
    { id: "doc-system", name: "manual-subjects-system.json", documentKind: "manual_subjects_system" }
  ]);

  const refs = getSelectionDocumentRefs({
    item: {
      id: "subject-manual",
      document_id: "doc-system",
      document_ref_ids: [],
      raw: {
        document_id: "doc-system",
        document_ref_ids: []
      }
    }
  });

  assert.equal(refs.length, 0);
});

test("document refs: un document système présent dans document_ref_ids est filtré", () => {
  seedProjectDocuments([
    { id: "doc-system", name: "manual-subjects-system.json", documentKind: "manual_subjects_system" },
    { id: "doc-user", name: "specifications.pdf", documentKind: "user_upload", phaseCode: "PRO", phaseLabel: "Projet" }
  ]);

  const refs = getSelectionDocumentRefs({
    item: {
      id: "subject-3",
      document_ref_ids: ["doc-system", "doc-user"]
    }
  });

  assert.deepEqual(refs.map((ref) => ref.id), ["doc-user"]);
});
