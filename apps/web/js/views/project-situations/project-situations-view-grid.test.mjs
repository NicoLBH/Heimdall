import test from "node:test";
import assert from "node:assert/strict";
import { __situationGridTestUtils, renderSituationGridView } from "./project-situations-view-grid.js";

test("resolveSituationTreeData remonte en racine les sujets dont le parent n'est pas sélectionné", () => {
  const { resolveSituationTreeData } = __situationGridTestUtils();
  const data = resolveSituationTreeData(
    [{ id: "child" }, { id: "sibling" }],
    {
      subjectsById: {
        parent: { id: "parent", title: "Parent" },
        child: { id: "child", title: "Child", parent_subject_id: "parent" },
        sibling: { id: "sibling", title: "Sibling" }
      },
      childrenBySubjectId: {
        parent: ["child"],
        child: [],
        sibling: []
      },
      parentBySubjectId: {
        child: "parent",
        sibling: null
      }
    }
  );

  assert.deepEqual(data.rootSubjectIds, ["child", "sibling"]);
  assert.deepEqual(data.childrenBySubjectId.child, []);
});

test("renderSituationGridView rend la grille et la colonne titre sans balise table", () => {
  const html = renderSituationGridView(
    { id: "sit-1", title: "Situation" },
    [{ id: "subject-1", title: "Sujet 1", status: "open" }],
    {
      store: {
        situationsView: {},
        projectSubjectsView: {
          rawSubjectsResult: {
            subjectsById: {
              "subject-1": { id: "subject-1", title: "Sujet 1", status: "open" }
            },
            childrenBySubjectId: {
              "subject-1": []
            },
            parentBySubjectId: {
              "subject-1": null
            }
          }
        }
      }
    }
  );

  assert.match(html, /project-situation-grid__header/);
  assert.match(html, /situation-grid__subject-title/);
  assert.doesNotMatch(html, /<table|<tr|<td/i);
});
