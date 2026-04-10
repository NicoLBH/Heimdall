export function createProjectSubjectsSelectors({
  store,
  ensureViewUiState,
  getRunBucket,
  getCustomSubjects,
  normalizeSubjectSituationIds,
  normalizeBackendPriority,
  getEffectiveSujetStatus,
  matchSearch,
  firstNonEmpty
}) {
  function getViewState() {
    ensureViewUiState();
    return store.projectSubjectsView || store.situationsView || {};
  }

  function getRawResult() {
    return getViewState().rawResult || {};
  }

  function getSubjectsByIdMap() {
    return getRawResult().subjectsById && typeof getRawResult().subjectsById === "object"
      ? getRawResult().subjectsById
      : {};
  }

  function getChildrenBySubjectIdMap() {
    return getRawResult().childrenBySubjectId && typeof getRawResult().childrenBySubjectId === "object"
      ? getRawResult().childrenBySubjectId
      : {};
  }

  function getParentBySubjectIdMap() {
    return getRawResult().parentBySubjectId && typeof getRawResult().parentBySubjectId === "object"
      ? getRawResult().parentBySubjectId
      : {};
  }

  function getLinksBySubjectIdMap() {
    return getRawResult().linksBySubjectId && typeof getRawResult().linksBySubjectId === "object"
      ? getRawResult().linksBySubjectId
      : {};
  }

  function getSituationsByIdMap() {
    return getRawResult().situationsById && typeof getRawResult().situationsById === "object"
      ? getRawResult().situationsById
      : {};
  }

  function getSubjectIdsBySituationIdMap() {
    return getRawResult().subjectIdsBySituationId && typeof getRawResult().subjectIdsBySituationId === "object"
      ? getRawResult().subjectIdsBySituationId
      : {};
  }

  function getRootSubjects() {
    const raw = getRawResult();
    const subjectsById = getSubjectsByIdMap();
    const ids = Array.isArray(raw.rootSubjectIds) ? raw.rootSubjectIds : [];
    return ids.map((id) => subjectsById[String(id || "")]).filter(Boolean);
  }

  function getSubjectById(subjectId) {
    return getSubjectsByIdMap()[String(subjectId || "")] || null;
  }

  function getCanonicalSujetById(subjectId) {
    return getSubjectById(subjectId);
  }

  function getNestedSujet(subjectId) {
    return getSubjectById(subjectId);
  }

  function getParentSubject(subjectId) {
    const parentId = getParentBySubjectIdMap()[String(subjectId || "")] || null;
    return parentId ? getSubjectById(parentId) : null;
  }

  function getChildSubjects(subjectId) {
    const ids = getChildrenBySubjectIdMap()[String(subjectId || "")] || [];
    return ids.map((id) => getSubjectById(id)).filter(Boolean);
  }

  function isRootSubject(subjectId) {
    return !getParentBySubjectIdMap()[String(subjectId || "")];
  }

  function isLeafSubject(subjectId) {
    return getChildSubjects(subjectId).length === 0;
  }

  function getSubjectDepth(subjectId) {
    let depth = 0;
    let cursor = getParentSubject(subjectId);
    const visited = new Set();
    while (cursor?.id && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      depth += 1;
      cursor = getParentSubject(cursor.id);
    }
    return depth;
  }

  function getNestedSituation(situationId) {
    return getSituationsByIdMap()[String(situationId || "")] || (getViewState().data || []).find((s) => s.id === situationId) || null;
  }

  function getSubjectsForSituation(situationOrId) {
    const situationId = String(typeof situationOrId === "object" ? situationOrId?.id || "" : situationOrId || "");
    const ids = getSubjectIdsBySituationIdMap()[situationId] || [];
    const linked = ids.map((id) => getSubjectById(id)).filter(Boolean);

    const { bucket } = getRunBucket();
    const metaMap = bucket?.subjectMeta?.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
    const existingIds = new Set(linked.map((subject) => String(subject?.id || "")).filter(Boolean));

    for (const [subjectId, meta] of Object.entries(metaMap)) {
      const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
      if (!linkedIds.includes(situationId) || existingIds.has(subjectId)) continue;
      const canonical = getSubjectById(subjectId) || getCustomSubjects().find((subject) => String(subject?.id || "") === subjectId);
      if (!canonical) continue;
      linked.push(canonical);
      existingIds.add(subjectId);
    }

    for (const customSubject of getCustomSubjects()) {
      const customId = String(customSubject?.id || "");
      if (!customId || existingIds.has(customId)) continue;
      const meta = metaMap[customId];
      const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
      if (!linkedIds.includes(situationId)) continue;
      linked.push(customSubject);
      existingIds.add(customId);
    }

    return linked;
  }

  function getSituationSubjects(situation) {
    return getSubjectsForSituation(situation);
  }

  function getSituationsForSubject(subjectId) {
    const normalizedId = String(subjectId || "");
    const entries = Object.entries(getSubjectIdsBySituationIdMap())
      .filter(([, ids]) => Array.isArray(ids) && ids.includes(normalizedId))
      .map(([situationId]) => getNestedSituation(situationId))
      .filter(Boolean);

    const { bucket } = getRunBucket();
    const metaMap = bucket?.subjectMeta?.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
    const meta = metaMap[normalizedId];
    for (const situationId of normalizeSubjectSituationIds(meta?.situationIds)) {
      const situation = getNestedSituation(situationId);
      if (situation && !entries.some((item) => String(item.id || "") === String(situation.id || ""))) entries.push(situation);
    }

    return entries;
  }

  function getSituationBySujetId(subjectId) {
    return getSituationsForSubject(subjectId)[0] || null;
  }

  function getOutgoingSubjectLinks(subjectId) {
    return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).filter((link) => String(link?.source_subject_id || "") === String(subjectId || ""));
  }

  function getIncomingSubjectLinks(subjectId) {
    return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).filter((link) => String(link?.target_subject_id || "") === String(subjectId || ""));
  }

  function getBlockedBySubjects(subjectId) {
    return getOutgoingSubjectLinks(subjectId)
      .filter((link) => String(link?.link_type || "") === "blocked_by")
      .map((link) => getSubjectById(link.target_subject_id))
      .filter(Boolean);
  }

  function getBlockingSubjects(subjectId) {
    return getIncomingSubjectLinks(subjectId)
      .filter((link) => String(link?.link_type || "") === "blocked_by")
      .map((link) => getSubjectById(link.source_subject_id))
      .filter(Boolean);
  }

  function getStandaloneCustomSubjects() {
    const linkedSituationIds = new Set(Object.keys(getSubjectIdsBySituationIdMap()));
    const { bucket } = getRunBucket();
    const metaMap = bucket?.subjectMeta?.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
    return getCustomSubjects().filter((subject) => {
      const meta = metaMap[String(subject?.id || "")];
      const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
      if (!linkedIds.length) return true;
      return !linkedIds.some((situationId) => linkedSituationIds.has(String(situationId || "")));
    });
  }

  function getCurrentSubjectsStatusFilter() {
    const v = getViewState();
    const value = String(v.filters?.status || v.subjectsStatusFilter || "open").toLowerCase();
    return value === "closed" ? "closed" : "open";
  }

  function getCurrentSubjectsPriorityFilter() {
    const v = getViewState();
    return normalizeBackendPriority(v.filters?.priority || v.subjectsPriorityFilter || "");
  }

  function sujetMatchesPriorityFilter(sujet, priorityFilter = "") {
    const activePriority = normalizeBackendPriority(priorityFilter || "");
    if (!activePriority) return true;
    return normalizeBackendPriority(firstNonEmpty(sujet?.priority, sujet?.prio, "medium")) === activePriority;
  }

  function sujetMatchesStatusFilter(sujet, statusFilter = getCurrentSubjectsStatusFilter()) {
    const effectiveStatus = String(getEffectiveSujetStatus(sujet?.id) || sujet?.status || "open").toLowerCase();
    return statusFilter === "closed" ? effectiveStatus !== "open" : effectiveStatus === "open";
  }

  function subjectMatchesFilters(sujet, query) {
    if (!sujet) return false;
    const priorityFilter = getCurrentSubjectsPriorityFilter();
    const sujetTextMatch = matchSearch([
      sujet.id, sujet.title, sujet.priority, sujet.status, sujet.agent, sujet.raw?.summary, sujet.raw?.topic, sujet.raw?.category, sujet.raw?.title
    ], query);
    return sujetTextMatch && sujetMatchesPriorityFilter(sujet, priorityFilter);
  }

  function situationMatchesFilters(situation, query) {
    const situationTextMatch = matchSearch([
      situation.id, situation.title, situation.priority, situation.status, situation.raw?.summary, situation.raw?.topic, situation.raw?.category, situation.raw?.title
    ], query);
    if (situationTextMatch) return true;
    return getSituationSubjects(situation).some((sujet) => subjectMatchesFilters(sujet, query));
  }

  function getFilteredSituations() {
    const query = String(getViewState().search || "").trim().toLowerCase();
    const situations = Array.isArray(getViewState().data) ? getViewState().data : [];
    return situations.filter((situation) => situationMatchesFilters(situation, query));
  }

  function getFilteredStandaloneSubjects() {
    const query = String(getViewState().search || "").trim().toLowerCase();
    return getStandaloneCustomSubjects().filter((sujet) => subjectMatchesFilters(sujet, query));
  }

  function getAvailableSubjectPriorities() {
    const priorities = new Set();
    for (const situation of Array.isArray(getViewState().data) ? getViewState().data : []) {
      for (const sujet of getSituationSubjects(situation)) {
        const priority = normalizeBackendPriority(firstNonEmpty(sujet?.priority, sujet?.prio, "medium"));
        if (priority) priorities.add(priority);
      }
    }
    for (const sujet of getStandaloneCustomSubjects()) {
      const priority = normalizeBackendPriority(firstNonEmpty(sujet?.priority, sujet?.prio, "medium"));
      if (priority) priorities.add(priority);
    }
    const order = ["critical", "high", "medium", "low"];
    return Array.from(priorities).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  function getSubjectsStatusCounts(query = "") {
    let open = 0;
    let closed = 0;
    const register = (subject, extra = []) => {
      const matches = matchSearch([
        ...extra, subject?.id, subject?.title, subject?.priority, subject?.status, subject?.agent, subject?.raw?.summary, subject?.raw?.topic, subject?.raw?.category, subject?.raw?.title
      ], query);
      if (!matches) return;
      if (sujetMatchesStatusFilter(subject, "closed")) closed += 1;
      else open += 1;
    };
    for (const situation of Array.isArray(getViewState().data) ? getViewState().data : []) {
      for (const sujet of getSituationSubjects(situation)) register(sujet, [situation?.id, situation?.title]);
    }
    for (const sujet of getStandaloneCustomSubjects()) register(sujet);
    return { open, closed };
  }

  function getVisibleCounts(filteredSituations) {
    let sujets = 0;
    let sousSujets = 0;
    const visit = (subject) => {
      const children = getChildSubjects(subject?.id);
      sousSujets += children.length;
      children.forEach(visit);
    };
    for (const situation of filteredSituations) {
      const subjects = getSituationSubjects(situation).filter((subject) => isRootSubject(subject?.id));
      sujets += subjects.length;
      subjects.forEach(visit);
    }
    for (const sujet of getFilteredStandaloneSubjects()) {
      if (!isRootSubject(sujet?.id)) continue;
      sujets += 1;
      visit(sujet);
    }
    return { situations: filteredSituations.length, sujets, sousSujets, totalSubjects: sujets + sousSujets };
  }

  function getNestedAvis() {
    return null;
  }

  function getSituationByAvisId() {
    return null;
  }

  function getSujetByAvisId() {
    return null;
  }

  return {
    getFilteredSituations,
    getStandaloneCustomSubjects,
    getFilteredStandaloneSubjects,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    sujetMatchesPriorityFilter,
    getAvailableSubjectPriorities,
    sujetMatchesStatusFilter,
    getSubjectsStatusCounts,
    getVisibleCounts,
    getNestedSituation,
    getCanonicalSujetById,
    getSituationSubjects,
    getNestedSujet,
    getSubjectById,
    getParentSubject,
    getChildSubjects,
    getRootSubjects,
    getSubjectsForSituation,
    getSituationsForSubject,
    getIncomingSubjectLinks,
    getOutgoingSubjectLinks,
    getBlockedBySubjects,
    getBlockingSubjects,
    getSubjectDepth,
    isRootSubject,
    isLeafSubject,
    getSituationBySujetId,
    getNestedAvis,
    getSituationByAvisId,
    getSujetByAvisId
  };
}
