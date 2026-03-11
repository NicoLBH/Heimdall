export const store = {
  user: null,
  projects: [],
  currentProject: null,
  currentProjectId: null,

  ui: {
    runId: "",
    systemStatus: {
      state: "idle",   // idle | running | done | error
      label: "Idle",
      meta: "—"
    }
  },

  projectForm: {
    communeCp: "",
    importance: "II",
    soilClass: "A",
    liquefaction: "no",
    referential: "EC8",
    pdfFile: null
  },

  situationsView: {
    data: [],
    expandedSituations: new Set(),
    expandedSujets: new Set(),
    selectedSituationId: null,
    selectedSujetId: null,
    selectedAvisId: null,
    verdictFilter: "ALL",
    search: "",
    displayDepth: "situations",
    page: 1,
    pageSize: 80
  }
};
