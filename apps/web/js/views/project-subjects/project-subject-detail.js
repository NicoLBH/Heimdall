export function createProjectSubjectDetailController(config) {
  const {
    store,
    setOverlayChromeOpenState,
    getActiveSelection,
    getSelectionEntityType,
    renderDetailsHtml,
    renderDetailsTitleWrapHtml,
    wireDetailsInteractive,
    bindDetailsScroll,
    ensureDrilldownDom,
    closeGlobalNav,
    markEntitySeen
  } = config;

  function updateDetailsModal() {
    const modal = document.getElementById("detailsModal");
    const head = modal?.querySelector?.(".modal__head");
    const title = document.getElementById("detailsTitleModal");
    const meta = document.getElementById("detailsMetaModal");
    const body = document.getElementById("detailsBodyModal");
    if (!modal || !title || !meta || !body) return;

    const isOpen = !!store.situationsView.detailsModalOpen;
    setOverlayChromeOpenState(modal, isOpen);
    document.body.classList.toggle("modal-open", isOpen);

    const details = renderDetailsHtml(null, {
      subissuesOptions: {
        sujetRowClass: "js-modal-drilldown-sujet",
        sujetToggleClass: "js-modal-toggle-sujet",
        avisRowClass: "js-modal-drilldown-avis",
        expandedSujets: store.situationsView.rightExpandedSujets
      }
    });

    if (head) head.classList.add("details-head--expanded");

    const selection = getActiveSelection();
    title.innerHTML = renderDetailsTitleWrapHtml(selection);
    meta.textContent = details.modalMeta;
    body.innerHTML = details.bodyHtml;

    ensureDrilldownDom();

    wireDetailsInteractive(body);
    bindDetailsScroll(document);
    body.__syncCondensedTitle?.();

    if (isOpen) {
      requestAnimationFrame(() => {
        const currentBody = document.getElementById("detailsBodyModal");
        currentBody?.__syncCondensedTitle?.();
      });
    }
  }

  function openDetailsModal() {
    closeGlobalNav();
    const selection = getActiveSelection();
    if (selection?.type && selection?.item?.id) {
      markEntitySeen(getSelectionEntityType(selection.type), selection.item.id, { source: "modal" });
    }
    store.situationsView.detailsModalOpen = true;
    updateDetailsModal();
  }

  function closeDetailsModal() {
    store.situationsView.detailsModalOpen = false;
    document.body.classList.remove("modal-open");
    updateDetailsModal();
  }

  return {
    renderDetailsTitleWrapHtml,
    renderDetailsHtml,
    updateDetailsModal,
    openDetailsModal,
    closeDetailsModal
  };
}
