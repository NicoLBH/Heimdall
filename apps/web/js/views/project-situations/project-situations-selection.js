export function createProjectSituationsSelection({ store, ensureSituationsViewState }) {
  function getViewState() {
    return ensureSituationsViewState();
  }

  function getSelectedSituationId() {
    return String(getViewState().selectedSituationId || "").trim() || null;
  }

  function setSelectedSituationId(situationId) {
    getViewState().selectedSituationId = situationId ? String(situationId) : null;
    return getSelectedSituationId();
  }

  function clearSelection() {
    return setSelectedSituationId(null);
  }

  return {
    getViewState,
    getSelectedSituationId,
    setSelectedSituationId,
    clearSelection
  };
}
