export function getDefaultCreateForm() {
  return {
    title: "",
    description: "",
    mode: "manual",
    automaticStatusOpen: true,
    automaticStatusClosed: false,
    automaticPriorityLow: false,
    automaticPriorityMedium: false,
    automaticPriorityHigh: false,
    automaticPriorityCritical: false,
    automaticBlockedOnly: false,
    automaticObjectiveIds: "",
    automaticLabelIds: "",
    automaticAssigneeIds: ""
  };
}

export function createProjectSituationsState({ store }) {
  const uiState = {
    loading: false,
    error: "",
    countsBySituationId: {},
    selectedSituationLoading: false,
    selectedSituationError: "",
    selectedSituationSubjects: [],
    createModalOpen: false,
    createSubmitting: false,
    createError: "",
    createForm: getDefaultCreateForm()
  };

  function ensureSituationsViewState() {
    if (!store.situationsView || typeof store.situationsView !== "object") {
      store.situationsView = {};
    }
    const view = store.situationsView;
    if (!Array.isArray(view.data)) view.data = [];
    if (typeof view.selectedSituationId !== "string" && view.selectedSituationId !== null) {
      view.selectedSituationId = null;
    }
    return view;
  }

  function resetCreateState() {
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.createForm = getDefaultCreateForm();
  }

  ensureSituationsViewState();

  return {
    uiState,
    ensureSituationsViewState,
    resetCreateState
  };
}
