export function buildSubjectHierarchyIndexes(subjectRows = [], subjectsById = {}) {
  const parentBySubjectId = {};
  const childrenBySubjectId = {};
  const rootSubjectIds = [];

  for (const subjectId of Object.keys(subjectsById || {})) {
    childrenBySubjectId[subjectId] = [];
  }

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;

    if (!Array.isArray(childrenBySubjectId[subjectId])) {
      childrenBySubjectId[subjectId] = [];
    }

    const parentId = String(subject?.parent_subject_id || "");
    parentBySubjectId[subjectId] = parentId || null;

    if (parentId && subjectsById[parentId] && parentId !== subjectId) {
      if (!Array.isArray(childrenBySubjectId[parentId])) {
        childrenBySubjectId[parentId] = [];
      }
      childrenBySubjectId[parentId].push(subjectId);
    } else {
      rootSubjectIds.push(subjectId);
    }
  }

  return {
    parentBySubjectId,
    childrenBySubjectId,
    rootSubjectIds
  };
}

function getRawSubjectsById(rawResult = {}) {
  return rawResult && typeof rawResult.subjectsById === "object" && rawResult.subjectsById
    ? rawResult.subjectsById
    : {};
}

export function getSubjectHierarchyFromRawResult(rawResult = {}) {
  const subjectsById = getRawSubjectsById(rawResult);
  const subjectRows = Object.values(subjectsById);

  if (!subjectRows.length) {
    return {
      parentBySubjectId: rawResult?.parentBySubjectId && typeof rawResult.parentBySubjectId === "object"
        ? rawResult.parentBySubjectId
        : {},
      childrenBySubjectId: rawResult?.childrenBySubjectId && typeof rawResult.childrenBySubjectId === "object"
        ? rawResult.childrenBySubjectId
        : {},
      rootSubjectIds: Array.isArray(rawResult?.rootSubjectIds)
        ? rawResult.rootSubjectIds
        : []
    };
  }

  return buildSubjectHierarchyIndexes(subjectRows, subjectsById);
}

export function getParentBySubjectIdMapFromRawResult(rawResult = {}) {
  return getSubjectHierarchyFromRawResult(rawResult).parentBySubjectId;
}

export function getChildrenBySubjectIdMapFromRawResult(rawResult = {}) {
  return getSubjectHierarchyFromRawResult(rawResult).childrenBySubjectId;
}

export function getRootSubjectIdsFromRawResult(rawResult = {}) {
  return getSubjectHierarchyFromRawResult(rawResult).rootSubjectIds;
}
