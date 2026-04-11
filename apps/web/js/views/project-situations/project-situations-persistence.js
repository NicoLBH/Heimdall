export function createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadSubjectsForSituation,
  createSituation
}) {
  async function refreshSituationsData({ forceSubjects = false } = {}) {
    await loadFlatSubjectsForCurrentProject({ force: forceSubjects });
    const situations = await loadSituationsForCurrentProject();
    const countsEntries = await Promise.all(situations.map(async (situation) => {
      const subjects = await loadSubjectsForSituation(situation, store.projectSubjectsView).catch(() => []);
      return [String(situation?.id || ""), safeArray(subjects).length];
    }));
    uiState.countsBySituationId = Object.fromEntries(countsEntries);
    return situations;
  }

  async function createSituationRecord(payload) {
    return createSituation(null, payload);
  }

  return {
    refreshSituationsData,
    createSituationRecord
  };
}
