export function getDefaultSituationForm() {
  return {
    title: "",
    description: "",
    status: "open",
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

export function getDefaultCreateForm() {
  return getDefaultSituationForm();
}

function toCsv(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : "";
}

export function getSituationEditForm(situation) {
  const filter = situation?.filter_definition && typeof situation.filter_definition === "object"
    ? situation.filter_definition
    : {};

  return {
    ...getDefaultSituationForm(),
    title: String(situation?.title || ""),
    description: String(situation?.description || ""),
    status: String(situation?.status || "open") === "closed" ? "closed" : "open",
    mode: String(situation?.mode || "manual") === "automatic" ? "automatic" : "manual",
    automaticStatusOpen: Array.isArray(filter.status) ? filter.status.includes("open") : true,
    automaticStatusClosed: Array.isArray(filter.status) ? filter.status.includes("closed") : false,
    automaticPriorityLow: Array.isArray(filter.priorities) ? filter.priorities.includes("low") : false,
    automaticPriorityMedium: Array.isArray(filter.priorities) ? filter.priorities.includes("medium") : false,
    automaticPriorityHigh: Array.isArray(filter.priorities) ? filter.priorities.includes("high") : false,
    automaticPriorityCritical: Array.isArray(filter.priorities) ? filter.priorities.includes("critical") : false,
    automaticBlockedOnly: Boolean(filter.blockedOnly),
    automaticObjectiveIds: toCsv(filter.objectiveIds),
    automaticLabelIds: toCsv(filter.labelIds),
    automaticAssigneeIds: toCsv(filter.assigneeIds)
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
    createForm: getDefaultCreateForm(),
    editPanelOpen: false,
    editSubmitting: false,
    editError: "",
    editForm: getDefaultSituationForm()
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
    if (!view.filters || typeof view.filters !== "object") {
      view.filters = { status: "open" };
    }
    if (typeof view.situationsStatusFilter !== "string") {
      view.situationsStatusFilter = String(view.filters.status || "open");
    }
    view.filters.status = String(view.situationsStatusFilter || view.filters.status || "open").toLowerCase() === "closed" ? "closed" : "open";
    view.situationsStatusFilter = view.filters.status;
    if (!view.kanbanStatusBySituationId || typeof view.kanbanStatusBySituationId !== "object" || Array.isArray(view.kanbanStatusBySituationId)) {
      view.kanbanStatusBySituationId = {};
    }
    return view;
  }

  function resetCreateState() {
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.createForm = getDefaultCreateForm();
  }

  function resetEditState() {
    uiState.editPanelOpen = false;
    uiState.editSubmitting = false;
    uiState.editError = "";
    uiState.editForm = getDefaultSituationForm();
  }

  ensureSituationsViewState();

  return {
    uiState,
    ensureSituationsViewState,
    resetCreateState,
    resetEditState
  };
}
