function logSituationCreate(step, payload = undefined) {
  if (payload === undefined) {
    console.log(`[situations:create] ${step}`);
    return;
  }
  console.log(`[situations:create] ${step}`, payload);
}

export function createProjectSituationsEvents({
  uiState,
  getDefaultCreateForm,
  normalizeSituationMode,
  buildCreateSituationPayload,
  rerender,
  refreshSituationsData,
  createSituationRecord,
  setSelectedSituationId,
  loadSituationSelection
}) {
  function openCreateModal(root) {
    logSituationCreate("open create modal click captured");
    uiState.createModalOpen = true;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.createForm = getDefaultCreateForm();
    rerender(root);
  }

  function closeCreateModal(root) {
    logSituationCreate("close create modal");
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
    rerender(root);
  }

  async function submitCreateSituation(root) {
    const payload = buildCreateSituationPayload();
    logSituationCreate("submitCreateSituation invoked", {
      payload,
      form: uiState.createForm || null
    });

    if (!String(payload.title || "").trim()) {
      logSituationCreate("submitCreateSituation blocked: missing title");
      uiState.createError = "Le titre est obligatoire.";
      rerender(root);
      return;
    }

    uiState.createSubmitting = true;
    uiState.createError = "";
    rerender(root);
    logSituationCreate("submitCreateSituation state switched to submitting");

    try {
      const created = await createSituationRecord(payload);
      logSituationCreate("createSituationRecord success", created);
      setSelectedSituationId(created?.id || null);
      uiState.createModalOpen = false;
      uiState.createSubmitting = false;
      uiState.createForm = getDefaultCreateForm();
      await refreshSituationsData(root, { forceSubjects: false });
      logSituationCreate("post-create refresh completed", {
        selectedSituationId: created?.id || null
      });
    } catch (error) {
      console.error("createSituation failed", error);
      logSituationCreate("createSituationRecord failed", {
        message: error instanceof Error ? error.message : String(error || "")
      });
      uiState.createSubmitting = false;
      uiState.createError = error instanceof Error ? error.message : "La création de la situation a échoué.";
      rerender(root);
    }
  }

  function bindEvents(root) {
    const openButton = root.querySelector("#openCreateSituationButton");
    if (openButton) {
      openButton.onclick = () => openCreateModal(root);
    }

    root.querySelectorAll("button[data-open-situation]").forEach((node) => {
      node.addEventListener("click", async () => {
        const situationId = String(node.getAttribute("data-open-situation") || "").trim();
        if (!situationId) return;
        setSelectedSituationId(situationId);
        const loadingPromise = loadSituationSelection(situationId);
        rerender(root);
        await loadingPromise;
        rerender(root);
      });
    });

    const modal = document.getElementById("projectCreateSituationModal");
    if (!modal) return;

    modal.querySelectorAll("[data-close-project-situation-modal]").forEach((node) => {
      node.addEventListener("click", () => closeCreateModal(root));
    });

    modal.querySelectorAll("[data-situation-create-field]").forEach((field) => {
      field.addEventListener("input", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-create-field") || "").trim();
        if (!key) return;
        uiState.createForm[key] = event.currentTarget.value;
        uiState.createError = "";
        logSituationCreate("create field input", { key, value: event.currentTarget.value });
      });
    });

    modal.querySelectorAll('input[name="situationCreateMode"]').forEach((field) => {
      field.addEventListener("change", (event) => {
        uiState.createForm.mode = event.currentTarget.value === "automatic" ? "automatic" : "manual";
        uiState.createError = "";
        logSituationCreate("create mode changed", { mode: uiState.createForm.mode });
        rerender(root);
      });
    });

    modal.querySelectorAll("[data-situation-create-checkbox]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-create-checkbox") || "").trim();
        if (!key) return;
        uiState.createForm[key] = !!event.currentTarget.checked;
        uiState.createError = "";
        logSituationCreate("create checkbox changed", { key, checked: !!event.currentTarget.checked });
      });
    });

    const submitButton = modal.querySelector("#projectCreateSituationSubmit");
    if (submitButton) {
      submitButton.addEventListener("click", async () => {
        logSituationCreate("submit button click captured", { disabled: !!submitButton.disabled });
        await submitCreateSituation(root);
      });
    }

    modal.addEventListener("submit", async (event) => {
      event.preventDefault();
      logSituationCreate("modal submit event captured");
      await submitCreateSituation(root);
    });
  }

  return {
    openCreateModal,
    closeCreateModal,
    submitCreateSituation,
    bindEvents
  };
}
