function normalizeUuid(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return (match ? match[0] : raw).toLowerCase();
}

function computeSituationIdForSubject(result = {}, subjectId = null) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) return null;
  const subject = result?.subjectsById?.[normalizedSubjectId];
  const subjectSituationId = normalizeUuid(subject?.situation_id);
  if (subjectSituationId) return subjectSituationId;
  const subjectIdsBySituationId = result?.subjectIdsBySituationId && typeof result.subjectIdsBySituationId === "object"
    ? result.subjectIdsBySituationId
    : {};
  for (const [situationId, subjectIds] of Object.entries(subjectIdsBySituationId)) {
    if (!Array.isArray(subjectIds)) continue;
    if (subjectIds.map((value) => normalizeUuid(value)).includes(normalizedSubjectId)) {
      return normalizeUuid(situationId);
    }
  }
  return null;
}

export function resolveSelectionAfterSubjectsLoad({
  result = {},
  currentSelectedSubjectId = null,
  currentSelectionRevision = 0,
  loadStartSelectionRevision = 0,
  snapshotSelectedSubjectId = null
} = {}) {
  const subjectsById = result?.subjectsById && typeof result.subjectsById === "object" ? result.subjectsById : {};
  const subjects = Array.isArray(result?.subjects) ? result.subjects : [];
  const normalizedCurrentSelectedSubjectId = normalizeUuid(currentSelectedSubjectId);
  const normalizedSnapshotSelectedSubjectId = normalizeUuid(snapshotSelectedSubjectId);
  const hasNewerUserSelection = Number(currentSelectionRevision) !== Number(loadStartSelectionRevision);

  let selectedSubjectId = null;
  let selectionReason = "none";

  if (normalizedCurrentSelectedSubjectId && subjectsById[normalizedCurrentSelectedSubjectId]) {
    selectedSubjectId = normalizedCurrentSelectedSubjectId;
    selectionReason = "keep-current-selection";
  } else if (!hasNewerUserSelection && normalizedSnapshotSelectedSubjectId && subjectsById[normalizedSnapshotSelectedSubjectId]) {
    selectedSubjectId = normalizedSnapshotSelectedSubjectId;
    selectionReason = "restore-load-snapshot-selection";
  } else if (subjects[0]?.id) {
    selectedSubjectId = normalizeUuid(subjects[0].id);
    selectionReason = "fallback-first-subject";
  }

  return {
    selectedSubjectId: selectedSubjectId || null,
    selectedSituationId: computeSituationIdForSubject(result, selectedSubjectId),
    hasNewerUserSelection,
    selectionReason
  };
}

export function shouldIgnoreSubjectsLoadApply({
  loadRequestId = 0,
  latestLoadRequestId = 0,
  loadProjectScopeId = null,
  currentProjectScopeId = null
} = {}) {
  if (Number(loadRequestId || 0) !== Number(latestLoadRequestId || 0)) {
    return { ignore: true, reason: "newer-request-exists" };
  }
  if ((loadProjectScopeId || null) !== (currentProjectScopeId || null)) {
    return { ignore: true, reason: "project-changed-before-apply" };
  }
  return { ignore: false, reason: "apply" };
}
