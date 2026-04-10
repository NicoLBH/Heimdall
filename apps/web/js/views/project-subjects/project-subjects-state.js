export function createProjectSubjectsState({ store }) {
  function getRawSubjectsViewState() {
    if (!store.situationsView || typeof store.situationsView !== "object") {
      store.situationsView = {};
    }
    return store.situationsView;
  }

  function ensureViewUiState() {
    const v = getRawSubjectsViewState();
    if (!(v.rightExpandedSujets instanceof Set)) {
      v.rightExpandedSujets = new Set(Array.isArray(v.rightExpandedSujets) ? v.rightExpandedSujets : []);
    }
    if (typeof v.rightSubissuesOpen !== "boolean") v.rightSubissuesOpen = true;
    if (typeof v.commentPreviewMode !== "boolean") v.commentPreviewMode = false;
    if (typeof v.helpMode !== "boolean") v.helpMode = false;
    if (typeof v.showTableOnly !== "boolean") v.showTableOnly = true;
    if (!v.tempAvisVerdict) v.tempAvisVerdict = "F";
    if (!v.tempAvisVerdictFor) v.tempAvisVerdictFor = null;
    if (!v.descriptionEdit || typeof v.descriptionEdit !== "object") {
      v.descriptionEdit = {
        entityType: null,
        entityId: null,
        draft: ""
      };
    }
    if (!v.drilldown || typeof v.drilldown !== "object") {
      v.drilldown = {
        isOpen: false,
        selectedSituationId: null,
        selectedSujetId: null,
        selectedAvisId: null,
        expandedSujets: new Set()
      };
    }
    if (!(v.drilldown.expandedSujets instanceof Set)) {
      v.drilldown.expandedSujets = new Set(Array.isArray(v.drilldown.expandedSujets) ? v.drilldown.expandedSujets : []);
    }
    if (typeof v.subjectsStatusFilter !== "string") v.subjectsStatusFilter = "open";
    if (typeof v.subjectsPriorityFilter !== "string") v.subjectsPriorityFilter = "";
    if (typeof v.situationsStatusFilter !== "string") v.situationsStatusFilter = "open";
    if (typeof v.subjectsSubview !== "string") v.subjectsSubview = "subjects";
    if (typeof v.objectivesStatusFilter !== "string") v.objectivesStatusFilter = "open";
    if (typeof v.selectedObjectiveId !== "string") v.selectedObjectiveId = "";
    if (!v.objectiveEdit || typeof v.objectiveEdit !== "object") {
      v.objectiveEdit = {
        isOpen: false,
        objectiveId: "",
        title: "",
        dueDate: "",
        description: "",
        calendarOpen: false,
        viewYear: 0,
        viewMonth: 0
      };
    }
    if (!v.subjectMetaDropdown || typeof v.subjectMetaDropdown !== "object") {
      v.subjectMetaDropdown = {
        field: null,
        query: "",
        activeKey: ""
      };
    }
    if (!v.subjectKanbanDropdown || typeof v.subjectKanbanDropdown !== "object") {
      v.subjectKanbanDropdown = {
        subjectId: "",
        situationId: "",
        query: "",
        activeKey: ""
      };
    }
    if (!v.createSubjectForm || typeof v.createSubjectForm !== "object") {
      v.createSubjectForm = {
        isOpen: false,
        title: "",
        description: "",
        previewMode: false,
        createMore: false,
        meta: {
          assignees: [],
          labels: [],
          objectiveIds: [],
          situationIds: [],
          relations: []
        },
        validationError: ""
      };
    }
    return v;
  }

  function getSubjectsViewState() {
    return ensureViewUiState();
  }

  function resetSubjectsViewTransientState() {
    const v = ensureViewUiState();
    v.descriptionEdit = {
      entityType: null,
      entityId: null,
      draft: ""
    };
    v.subjectMetaDropdown = {
      field: null,
      query: "",
      activeKey: ""
    };
    v.subjectKanbanDropdown = {
      subjectId: "",
      situationId: "",
      query: "",
      activeKey: ""
    };
    return v;
  }

  function getSubjectsTabResetState() {
    const v = ensureViewUiState();
    return {
      subjectsSubview: String(v.subjectsSubview || "subjects"),
      selectedObjectiveId: String(v.selectedObjectiveId || ""),
      showTableOnly: !!v.showTableOnly,
      detailsModalOpen: !!v.detailsModalOpen,
      drilldownOpen: !!v.drilldown?.isOpen,
      subjectMetaDropdownOpen: !!v.subjectMetaDropdown?.field,
      subjectKanbanDropdownOpen: !!v.subjectKanbanDropdown?.subjectId,
      objectiveEditOpen: !!v.objectiveEdit?.isOpen,
      createSubjectFormOpen: !!v.createSubjectForm?.isOpen
    };
  }

  return {
    ensureViewUiState,
    getSubjectsViewState,
    resetSubjectsViewTransientState,
    getSubjectsTabResetState
  };
}
