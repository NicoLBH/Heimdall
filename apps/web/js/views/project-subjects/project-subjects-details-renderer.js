import { renderSharedDetailsTitleWrap, renderSharedDetailsTitleHtml } from "../ui/detail-header.js";

export function createProjectSubjectsDetailsRenderer(config) {
  const {
    getActiveSelection,
    getSelectionEntityType,
    getEffectiveAvisVerdict,
    getEffectiveSujetStatus,
    getEffectiveSituationStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    entityDisplayLinkHtml,
    problemsCountsHtml,
    firstNonEmpty,
    escapeHtml,
    renderVerboseAvisVerdictPill,
    statePill,
    renderDescriptionCard,
    getSujetByAvisId,
    renderSubIssuesForSujet,
    renderSubIssuesForSituation,
    renderThreadBlock,
    renderCommentBox,
    renderDetailedMetaForSelection,
    renderSubjectMetaControls,
    renderDocumentRefsCard
  } = config;

  function renderDetailsTitleWrapHtml(selection) {
    return renderSharedDetailsTitleWrap(selection, {
      emptyText: "Sélectionner un élément",
      buildTitleTextHtml(currentSelection) {
        const item = currentSelection.item;
        const entityType = getSelectionEntityType(currentSelection.type);
        const titleSeenClass = getReviewTitleStateClass(entityType, item.id);
        return `
          <span class="details-title-text ${titleSeenClass}">${escapeHtml(firstNonEmpty(item.title, item.id, "Détail"))}</span>
        `;
      },
      buildIdHtml(currentSelection) {
        return entityDisplayLinkHtml(currentSelection.type, currentSelection.item.id);
      },
      buildExpandedBottomHtml(currentSelection) {
        const item = currentSelection.item;
        if (currentSelection.type === "avis") {
          return renderVerboseAvisVerdictPill(getEffectiveAvisVerdict(item.id));
        }
        if (currentSelection.type === "sujet") {
          const badgeHtml = statePill(getEffectiveSujetStatus(item.id), {
            reviewState: getEntityReviewMeta("sujet", item.id).review_state,
            entityType: "sujet"
          });
          return `${badgeHtml}`;
        }
        const badgeHtml = statePill(getEffectiveSituationStatus(item.id), {
          reviewState: getEntityReviewMeta("situation", item.id).review_state,
          entityType: "situation"
        });
        return `${badgeHtml}${problemsCountsHtml(item)}`;
      },
      buildCompactConfig(currentSelection, { titleTextHtml, idHtml }) {
        const item = currentSelection.item;
        if (currentSelection.type === "avis") {
          return {
            variant: "inline",
            wrapClass: "details-title--compact-avis",
            bodyClass: "details-title-compact--avis",
            leftHtml: renderVerboseAvisVerdictPill(getEffectiveAvisVerdict(item.id)),
            topHtml: titleTextHtml,
            idHtml
          };
        }
        if (currentSelection.type === "sujet") {
          return {
            variant: "grid",
            wrapClass: "details-title--compact-grid",
            leftHtml: statePill(getEffectiveSujetStatus(item.id), {
              reviewState: getEntityReviewMeta("sujet", item.id).review_state,
              entityType: "sujet"
            }),
            topHtml: titleTextHtml,
            bottomHtml: ""
          };
        }
        return {
          variant: "grid",
          wrapClass: "details-title--compact-grid",
          leftHtml: statePill(getEffectiveSituationStatus(item.id), {
            reviewState: getEntityReviewMeta("situation", item.id).review_state,
            entityType: "situation"
          }),
          topHtml: titleTextHtml,
          bottomHtml: `${problemsCountsHtml(item)}`
        };
      }
    });
  }

  function renderDetailsTitleHtml(selection, options = {}) {
    const showExpand = options.showExpand !== false;
    return renderSharedDetailsTitleHtml(selection, {
      showExpand,
      titleWrapHtml: renderDetailsTitleWrapHtml(selection),
      emptyPanelTitle: "Sélectionner un élément",
      buildKickerText() {
        return "";
      },
      buildMetaHtml(currentSelection) {
        return escapeHtml(currentSelection?.item?.id || "—");
      }
    });
  }

  function renderDetailsBody(selection, options = {}) {
    if (!selection) {
      return `<div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div>`;
    }

    const item = selection.item;
    let descCard = "";
    let subIssuesHtml = "";

    if (selection.type === "avis") {
      descCard = renderDescriptionCard(selection);
      const sujet = getSujetByAvisId(item.id);
      if (sujet) {
        subIssuesHtml = renderSubIssuesForSujet(sujet, options.subissuesOptions || {});
      }
    } else if (selection.type === "sujet") {
      descCard = renderDescriptionCard(selection);
      subIssuesHtml = renderSubIssuesForSujet(item, options.subissuesOptions || {});
    } else {
      descCard = renderDescriptionCard(selection);
      subIssuesHtml = renderSubIssuesForSituation(item, options.subissuesOptions || {});
    }

    const threadHtml = renderThreadBlock();
    const commentBoxHtml = renderCommentBox(selection);
    const metaHtml = renderDetailedMetaForSelection(selection);
    const subjectMetaControlsHtml = selection.type === "sujet" ? renderSubjectMetaControls(item) : "";

    return `
      <div class="details-grid">
        <div class="details-main">
          <div class="gh-timeline">
            ${descCard}
            ${renderDocumentRefsCard(selection)}
            ${subIssuesHtml}
            ${threadHtml}
            ${commentBoxHtml}
          </div>
        </div>
        <aside class="details-meta-col">
          ${subjectMetaControlsHtml}
          <div class="meta-title">Metadata</div>
          ${metaHtml}
        </aside>
      </div>
    `;
  }

  function renderDetailsHtml(selectionOverride = null, options = {}) {
    const selection = selectionOverride || getActiveSelection();
    return {
      titleHtml: renderDetailsTitleHtml(selection),
      bodyHtml: renderDetailsBody(selection, options),
      modalTitle: selection ? firstNonEmpty(selection.item.title, selection.item.id, "Détail") : "Sélectionner un élément",
      modalMeta: selection ? firstNonEmpty(selection.item.id, "") : "—"
    };
  }

  return {
    renderDetailsTitleWrapHtml,
    renderDetailsTitleHtml,
    renderDetailsBody,
    renderDetailsHtml
  };
}
