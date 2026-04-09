
export function createProjectSubjectDrilldownController(config) {
  const {
    store,
    setOverlayChromeOpenState,
    closeGlobalNav,
    renderOverlayChrome,
    renderOverlayChromeHead,
    bindOverlayChromeDismiss,
    getNestedAvis,
    getNestedSujet,
    getNestedSituation,
    getSituationBySujetId,
    getSujetByAvisId,
    getSituationByAvisId,
    renderDetailsHtml,
    renderDetailsTitleWrapHtml,
    wireDetailsInteractive,
    bindDetailsScroll,
    markEntitySeen,
    ensureViewUiState
  } = config;

  function ensureDrilldownDom() {
    if (document.getElementById("drilldownPanel")) return;

    const panel = document.createElement("div");
    panel.id = "drilldownPanel";
    panel.className = "drilldown overlay-host overlay-host--side hidden";
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = renderOverlayChrome({
      shellClassName: "drilldown__inner gh-panel gh-panel--details",
      variant: "drilldown",
      ariaLabel: "Détails",
      headHtml: renderOverlayChromeHead({
        titleId: "drilldownTitle",
        closeId: "drilldownClose",
        closeLabel: "Fermer",
        headClassName: "drilldown__head"
      }),
      bodyId: "drilldownBody",
      bodyClassName: "drilldown__body details-body"
    });

    document.body.appendChild(panel);

    bindOverlayChromeDismiss(panel, {
      onClose: closeDrilldown
    });
  }

  function getDrilldownSelection() {
    ensureViewUiState();
    const dd = store.situationsView.drilldown;
    if (!dd) return null;
    if (dd.selectedAvisId) {
      const avis = getNestedAvis(dd.selectedAvisId);
      if (avis) return { type: "avis", item: avis };
    }
    if (dd.selectedSujetId) {
      const sujet = getNestedSujet(dd.selectedSujetId);
      if (sujet) return { type: "sujet", item: sujet };
    }
    if (dd.selectedSituationId) {
      const situation = getNestedSituation(dd.selectedSituationId);
      if (situation) return { type: "situation", item: situation };
    }
    return null;
  }

  function updateDrilldownPanel() {
    ensureViewUiState();
    ensureDrilldownDom();

    const panel = document.getElementById("drilldownPanel");
    const title = document.getElementById("drilldownTitle");
    const body = document.getElementById("drilldownBody");
    if (!panel || !title || !body) return;

    const selection = getDrilldownSelection();
    const details = renderDetailsHtml(selection, {
      subissuesOptions: {
        sujetRowClass: "js-drilldown-select-sujet",
        sujetToggleClass: "js-drilldown-toggle-sujet",
        avisRowClass: "js-drilldown-select-avis",
        expandedSujets: store.situationsView.drilldown.expandedSujets
      }
    });

    title.innerHTML = selection ? renderDetailsTitleWrapHtml(selection) : "—";
    body.innerHTML = details.bodyHtml;

    wireDetailsInteractive(body);
    bindDetailsScroll(document);
    body.__syncCondensedTitle?.();
  }

  function openDrilldown() {
    ensureViewUiState();
    ensureDrilldownDom();
    closeGlobalNav();
    store.situationsView.drilldown.isOpen = true;
    const panel = document.getElementById("drilldownPanel");
    setOverlayChromeOpenState(panel, true);
    document.body.classList.add("drilldown-open");
    updateDrilldownPanel();
  }

  function closeDrilldown() {
    ensureViewUiState();
    store.situationsView.drilldown.isOpen = false;
    const panel = document.getElementById("drilldownPanel");
    setOverlayChromeOpenState(panel, false);
    document.body.classList.remove("drilldown-open");
  }

  function openDrilldownFromSituation(situationId) {
    ensureViewUiState();
    const situation = getNestedSituation(situationId);
    if (!situation) return;
    store.situationsView.drilldown.selectedSituationId = situation.id;
    store.situationsView.drilldown.selectedSujetId = null;
    store.situationsView.drilldown.selectedAvisId = null;
    markEntitySeen("situation", situation.id, { source: "drilldown" });
    openDrilldown();
  }

  function openDrilldownFromSujet(sujetId) {
    ensureViewUiState();
    const sujet = getNestedSujet(sujetId);
    const situation = getSituationBySujetId(sujetId);
    if (!sujet) return;
    store.situationsView.drilldown.selectedSituationId = situation?.id || null;
    store.situationsView.drilldown.selectedSujetId = sujet.id;
    store.situationsView.drilldown.selectedAvisId = null;
    store.situationsView.drilldown.expandedSujets.add(sujet.id);
    markEntitySeen("sujet", sujet.id, { source: "drilldown" });
    openDrilldown();
  }

  function openDrilldownFromAvis(avisId) {
    ensureViewUiState();
    const avis = getNestedAvis(avisId);
    const sujet = getSujetByAvisId(avisId);
    const situation = getSituationByAvisId(avisId);
    if (!avis) return;
    store.situationsView.drilldown.selectedSituationId = situation?.id || null;
    store.situationsView.drilldown.selectedSujetId = sujet?.id || null;
    store.situationsView.drilldown.selectedAvisId = avis.id;
    if (sujet?.id) store.situationsView.drilldown.expandedSujets.add(sujet.id);
    markEntitySeen("avis", avis.id, { source: "drilldown" });
    openDrilldown();
  }

  return {
    ensureDrilldownDom,
    getDrilldownSelection,
    updateDrilldownPanel,
    openDrilldown,
    closeDrilldown,
    openDrilldownFromSituation,
    openDrilldownFromSujet,
    openDrilldownFromAvis
  };
}
