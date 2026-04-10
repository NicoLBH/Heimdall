export function createProjectSubjectsThread(config = {}) {
  const {
    store,
    ensureViewUiState,
    firstNonEmpty,
    nowIso,
    fmtTs,
    mdToHtml,
    escapeHtml,
    svgIcon,
    SVG_AVATAR_HUMAN,
    SVG_ISSUE_CLOSED,
    SVG_ISSUE_REOPENED,
    SVG_TL_CLOSED,
    SVG_TL_REOPENED,
    renderGhActionButton,
    renderMessageThread,
    renderMessageThreadComment,
    renderMessageThreadActivity,
    renderMessageThreadEvent,
    renderCommentComposer,
    renderReviewStateIcon,
    getRunBucket,
    persistRunBucket,
    getEntityByType,
    getActiveSelection,
    getSelectionEntityType,
    getSituationBySujetId,
    getSituationByAvisId,
    getSujetByAvisId,
    getNestedSujet,
    getNestedAvis,
    getEffectiveAvisVerdict,
    getEffectiveSujetStatus,
    getEffectiveSituationStatus,
    entityDisplayLinkHtml,
    inferAgent,
    normActorName,
    miniAuthorIconHtml,
    verdictIconHtml
  } = config;

  function addComment(entityType, entityId, message, options = {}) {
    persistRunBucket((bucket) => {
      bucket.comments.push({
        ts: nowIso(),
        entity_type: entityType,
        entity_id: entityId,
        type: "COMMENT",
        actor: options.actor || "Human",
        agent: options.agent || "human",
        message: String(message || ""),
        pending: !!options.pending,
        request_id: options.request_id || null,
        meta: options.meta || {}
      });
    });
  }

  function addActivity(entityType, entityId, kind, message = "", meta = {}, options = {}) {
    persistRunBucket((bucket) => {
      bucket.activities.push({
        ts: nowIso(),
        entity_type: entityType,
        entity_id: entityId,
        type: "ACTIVITY",
        kind,
        actor: options.actor || "Human",
        agent: options.agent || "human",
        message: String(message || ""),
        meta: meta || {}
      });
    });
  }

  function extractValidatedVerdict(decision) {
    const d = String(decision || "").toUpperCase();
    const m = d.match(/^VALIDATED_(F|D|S|HM|PM|SO)$/);
    return m ? m[1] : null;
  }

  function decisionStatus(decision) {
    const d = String(decision || "").toUpperCase();
    if (d === "CLOSED") return "closed";
    if (d === "REOPENED" || d === "OPEN") return "open";
    return null;
  }

  function setDecision(entityType, entityId, decision, note = "", options = {}) {
    const actor = options.actor || "Human";
    const agent = options.agent || "human";
    const ts = options.ts || nowIso();
    const nextDecision = String(decision || "");
    const nextNote = String(note || "");

    persistRunBucket((bucket) => {
      bucket.decisions[entityType] = bucket.decisions[entityType] || {};
      const prev = bucket.decisions[entityType][entityId] || null;
      bucket.decisions[entityType][entityId] = {
        ts,
        actor,
        decision: nextDecision,
        note: nextNote
      };

      const prevStatus = decisionStatus(prev?.decision);
      const nextStatus = decisionStatus(nextDecision);
      if ((entityType === "sujet" || entityType === "situation") && nextStatus && nextStatus !== prevStatus) {
        const targetType = entityType === "sujet" ? "situation" : "situation";
        const parentSituation = entityType === "sujet" ? getSituationBySujetId(entityId) : null;
        const targetId = entityType === "sujet" ? (parentSituation?.id || entityId) : entityId;
        bucket.activities.push({
          ts,
          entity_type: targetType,
          entity_id: targetId,
          type: "ACTIVITY",
          kind: nextStatus === "closed" ? "issue_closed" : "issue_reopened",
          actor,
          agent,
          message: nextNote,
          meta: entityType === "sujet" ? { problem_id: entityId } : { situation_id: entityId }
        });
      }

      if (entityType === "avis") {
        const fromVerdict = extractValidatedVerdict(prev?.decision);
        const toVerdict = extractValidatedVerdict(nextDecision);
        if (toVerdict && toVerdict !== fromVerdict) {
          const parentSujet = getSujetByAvisId(entityId);
          bucket.activities.push({
            ts,
            entity_type: parentSujet?.id ? "sujet" : "avis",
            entity_id: parentSujet?.id || entityId,
            type: "ACTIVITY",
            kind: "avis_verdict_changed",
            actor,
            agent,
            message: nextNote,
            meta: { avis_id: entityId, from: fromVerdict, to: toVerdict }
          });
        }
      }
    });
  }

  function getDecision(entityType, entityId) {
    const { bucket } = getRunBucket();
    return bucket?.decisions?.[entityType]?.[entityId] || null;
  }

  function getThreadForSelection() {
    ensureViewUiState();
    const selection = getActiveSelection();
    if (!selection) return [];

    const { bucket } = getRunBucket();
    const comments = Array.isArray(bucket?.comments) ? bucket.comments : [];
    const activities = Array.isArray(bucket?.activities) ? bucket.activities : [];
    const events = [];

    const s = selection.type === "situation" ? selection.item : (selection.type === "sujet" ? getSituationBySujetId(selection.item.id) : getSituationByAvisId(selection.item.id));
    const p = selection.type === "sujet" ? selection.item : (selection.type === "avis" ? getSujetByAvisId(selection.item.id) : null);
    const a = selection.type === "avis" ? selection.item : null;
    const rootTs = firstNonEmpty(store.situationsView?.rawResult?.updated_at, store.situationsView?.rawResult?.created_at, nowIso());

    if (a) {
      if (store.situationsView.tempAvisVerdictFor !== a.id) {
        store.situationsView.tempAvisVerdictFor = a.id;
        store.situationsView.tempAvisVerdict = String(getEffectiveAvisVerdict(a.id) || "F").toUpperCase();
      }
    } else {
      store.situationsView.tempAvisVerdictFor = null;
      store.situationsView.tempAvisVerdict = store.situationsView.tempAvisVerdict || "F";
    }

    if (s) {
      events.push({
        ts: rootTs,
        actor: "System",
        agent: inferAgent(s),
        type: "SITUATION",
        entity_type: "situation",
        entity_id: s.id,
        message: `${firstNonEmpty(s.title, s.id, "(sans titre)")}
priority=${firstNonEmpty(s.priority, "")}
sujets=${(s.sujets || []).length}`
      });
    }
    if (p) {
      events.push({
        ts: rootTs,
        actor: "System",
        agent: inferAgent(p),
        type: "SUJET",
        entity_type: "sujet",
        entity_id: p.id,
        message: `${firstNonEmpty(p.title, p.id, "Non classé")}
priority=${firstNonEmpty(p.priority, "")}
avis=${(p.avis || []).length}`
      });
    }
    if (a) {
      events.push({
        ts: rootTs,
        actor: "System",
        agent: inferAgent(a),
        type: "AVIS",
        entity_type: "avis",
        entity_id: a.id,
        message: `${firstNonEmpty(a.title, a.id)}
severity=${firstNonEmpty(a.severity, "")}
verdict=${firstNonEmpty(a.verdict, "")}
agent=${inferAgent(a)}

${firstNonEmpty(a.raw?.message, a.raw?.summary, "")}`
      });
    }

    const allowedComments = new Set();
    const allowedActivities = new Set();
    const entityKey = (type, id) => `${String(type || "").toLowerCase()}:${String(id || "")}`;

    if (a) {
      allowedComments.add(entityKey("avis", a.id));
      allowedActivities.add(entityKey("avis", a.id));
      if (p) allowedActivities.add(entityKey("sujet", p.id));
    } else if (p) {
      allowedComments.add(entityKey("sujet", p.id));
      allowedActivities.add(entityKey("sujet", p.id));
      if (s) allowedActivities.add(entityKey("situation", s.id));
    } else if (s) {
      allowedComments.add(entityKey("situation", s.id));
      allowedActivities.add(entityKey("situation", s.id));
    }

    const isViewingAvis = !!a;
    const isViewingSujet = !!p && !a;

    const humanEvents = [...comments, ...activities].filter((e) => {
      const k = entityKey(e.entity_type, e.entity_id);
      const t = String(e?.type || "").toUpperCase();

      if (t === "COMMENT") return allowedComments.has(k);
      if (t !== "ACTIVITY") return allowedComments.has(k) || allowedActivities.has(k);
      if (!allowedActivities.has(k)) return false;

      const kind = String(e?.kind || "").toLowerCase();
      const meta = e?.meta || {};

      if (isViewingAvis) {
        if (kind === "avis_verdict_changed") return String(meta?.avis_id || "") === String(a.id);
        if (kind === "issue_closed" || kind === "issue_reopened") {
          if (meta?.problem_id) return String(meta.problem_id) === String(p?.id || "");
        }
        return true;
      }

      if (isViewingSujet) {
        if (String(e?.entity_type || "").toLowerCase() === "situation") {
          if (meta?.problem_id) return String(meta.problem_id) === String(p.id);
        }
        return true;
      }

      return true;
    });

    const orderRank = (e) => {
      const t = String(e?.type || "").toUpperCase();
      if (t === "SITUATION") return 0;
      if (t === "SUJET") return 1;
      if (t === "AVIS") return 2;
      return 3;
    };

    return [...events, ...humanEvents].sort((x, y) => {
      const xr = orderRank(x);
      const yr = orderRank(y);
      if (xr !== yr) return xr - yr;
      return String(x.ts || "").localeCompare(String(y.ts || ""));
    });
  }

  function renderThreadBlock() {
    const thread = getThreadForSelection();
    if (!thread.length) return "";

    const itemsHtml = thread.map((e, idx) => {
      const type = String(e?.type || "").toUpperCase();

      if (type === "COMMENT") {
        const agent = String(e?.agent || "").toLowerCase();
        const isHuman = agent === "human" || !agent;
        const isRapso = !isHuman && agent === "specialist_ps";
        const displayName = isRapso ? "Agent specialist_ps" : normActorName(e?.actor, agent);
        const avatarInitial = isRapso ? "AS" : ((agent[0] || "S").toUpperCase());
        const tsHtml = e?.ts ? `<div class="mono-small">${escapeHtml(fmtTs(e.ts))}</div>` : "";

        return renderMessageThreadComment({
          idx,
          author: displayName,
          tsHtml,
          bodyHtml: mdToHtml(e?.message || ""),
          avatarType: isHuman ? "human" : "agent",
          avatarHtml: isHuman ? SVG_AVATAR_HUMAN : "",
          avatarInitial
        });
      }

      if (type === "ACTIVITY") {
        const kind = String(e?.kind || "").toLowerCase();
        const agent = e?.agent || "system";
        const displayName = normActorName(e?.actor, agent);
        const ts = fmtTs(e?.ts || "");
        let iconHtml = `<span class="tl-ico tl-ico--muted" aria-hidden="true"></span>`;
        let verb = "updated";
        let targetHtml = "";

        if (kind === "issue_closed") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${SVG_TL_CLOSED}</span>`;
          const sujetId = e?.meta?.problem_id;
          const sujet = sujetId ? getNestedSujet(sujetId) : null;
          const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
          verb = "closed";
          targetHtml = sujetId ? `sujet ${sujetTitle}${entityDisplayLinkHtml("sujet", sujetId)}` : "this";
        } else if (kind === "issue_reopened") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
          const sujetId = e?.meta?.problem_id;
          const sujet = sujetId ? getNestedSujet(sujetId) : null;
          const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
          verb = "reopened";
          targetHtml = sujetId ? `sujet ${sujetTitle}${entityDisplayLinkHtml("sujet", sujetId)}` : "this";
        } else if (kind === "review_validated" || kind === "review_rejected" || kind === "review_dismissed" || kind === "review_restored") {
          const entityType = String(e?.entity_type || "").toLowerCase();
          const entityId = String(e?.entity_id || "");
          const entity = getEntityByType(entityType, entityId);
          const entityTitle = entity?.title ? `${escapeHtml(entity.title)} ` : "";
          const counts = e?.meta?.counts || {};
          const descendants = Math.max(0, Number(counts?.sujet || 0) + Number(counts?.avis || 0) + Number(counts?.situation || 0) - 1);

          if (kind === "review_validated") {
            iconHtml = renderReviewStateIcon("validated", { entityType });
            verb = "validated";
          } else if (kind === "review_restored") {
            iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
            verb = "restored";
          } else {
            iconHtml = renderReviewStateIcon(kind === "review_dismissed" ? "dismissed" : "rejected", { entityType, isSeen: true });
            verb = kind === "review_dismissed" ? "dismissed" : "rejected";
          }

          targetHtml = entityId
            ? `${entityType} ${entityTitle}${entityDisplayLinkHtml(entityType, entityId)}${descendants > 0 ? ` · ${descendants} descendant(s)` : ""}`
            : "this";
        } else if (kind === "avis_verdict_changed") {
          const toV = e?.meta?.to || "";
          const avisId = e?.meta?.avis_id;
          const avis = avisId ? getNestedAvis(avisId) : null;
          const avisTitle = avis?.title ? `${escapeHtml(avis.title)} ` : "";
          iconHtml = verdictIconHtml(toV);
          verb = "changed verdict";
          targetHtml = avisId
            ? `avis ${avisTitle}${entityDisplayLinkHtml("avis", avisId)} → ${escapeHtml(String(toV || ""))}`
            : escapeHtml(String(toV || ""));
        } else if (kind === "description_version_initial" || kind === "description_version_saved") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("pencil")}</span>`;
          verb = kind === "description_version_initial" ? "archived description" : "saved description";
          const entityType = String(e?.entity_type || "").toLowerCase();
          const entityId = String(e?.entity_id || "");
          const entity = getEntityByType(entityType, entityId);
          const entityTitle = entity?.title ? `${escapeHtml(entity.title)} ` : "";
          targetHtml = entityId ? `${entityType} ${entityTitle}${entityDisplayLinkHtml(entityType, entityId)}` : "this";
        }

        const note = String(e?.message || "").trim();
        const noteHtml = note ? `<div class="tl-note">${mdToHtml(note)}</div>` : "";

        return renderMessageThreadActivity({
          idx,
          iconHtml,
          authorIconHtml: miniAuthorIconHtml(agent),
          textHtml: `
            <span class="tl-author-name">${escapeHtml(displayName)}</span>
            <span class="mono-small"> ${escapeHtml(verb)} ${targetHtml || ""} </span>
            <span class="mono-small">at ${escapeHtml(ts)}</span>
          `,
          noteHtml
        });
      }

      return renderMessageThreadEvent({
        idx,
        badgeHtml: `
          <div class="thread-badge__subissue">
            ${svgIcon("issue-tracks", {
              className: "octicon octicon-issue-tracks Octicon__StyledOcticon-sc-jtj3m8-0 TimelineRow-module__Octicon__SMhVa"
            })}
          </div>
        `,
        headHtml: `
          <div class="mono">
            <span>${escapeHtml(e.actor || "System")}</span>
            <span> attached this to </span>
            <span>${escapeHtml(e.entity_type || "")} n° ${entityDisplayLinkHtml(e.entity_type, e.entity_id)}</span>
            <span>·</span>
            <span> (agent=${escapeHtml(e.agent || "system")})</span>
            <div class="mono">in ${escapeHtml(fmtTs(e.ts || ""))}</div>
          </div>
        `,
        bodyHtml: escapeHtml(e.message || "")
      });
    }).join("");

    return `
      <div class="gh-timeline-title gh-timeline-title--hidden mono">Discussion</div>
      ${renderMessageThread({ itemsHtml })}
    `;
  }

  function renderIssueStatusAction(selection) {
    if (!selection?.type || !selection?.item?.id) return "";
    if (selection.type === "avis") return "";

    const item = selection.item;
    const issueStatus = selection.type === "sujet"
      ? getEffectiveSujetStatus(item.id)
      : getEffectiveSituationStatus(item.id);
    const isOpen = String(issueStatus || "open").toLowerCase() === "open";

    return renderGhActionButton({
      id: `issue-status-${selection.type}-${item.id}`,
      label: isOpen ? "Close" : "Reopen",
      icon: isOpen ? SVG_ISSUE_CLOSED : SVG_ISSUE_REOPENED,
      tone: "default",
      size: "sm",
      className: "js-issue-status-action",
      mainAction: isOpen ? "issue:close:realized" : "issue:reopen",
      items: isOpen
        ? [
            {
              label: "Fermé comme réalisé",
              action: "issue:close:realized",
              icon: SVG_ISSUE_CLOSED
            },
            {
              label: "Fermé comme non pertinent",
              action: "issue:close:dismissed",
              icon: renderReviewStateIcon("dismissed", { entityType: getSelectionEntityType(selection.type) })
            },
            {
              label: "Fermé comme dupliqué",
              action: "issue:close:duplicate",
              icon: renderReviewStateIcon("rejected", { entityType: getSelectionEntityType(selection.type) })
            }
          ]
        : [
            {
              label: "Ré-ouvrir",
              action: "issue:reopen",
              icon: SVG_ISSUE_REOPENED
            },
            {
              label: "Fermé comme non pertinent",
              action: "issue:close:dismissed",
              icon: renderReviewStateIcon("dismissed", { entityType: getSelectionEntityType(selection.type) })
            },
            {
              label: "Fermé comme dupliqué",
              action: "issue:close:duplicate",
              icon: renderReviewStateIcon("rejected", { entityType: getSelectionEntityType(selection.type) })
            }
          ]
    });
  }

  function renderCommentBox(selection) {
    ensureViewUiState();
    const item = selection?.item || null;
    if (!item) return "";

    const type = selection.type;
    const issueStatus =
      type === "avis"
        ? "open"
        : type === "sujet"
          ? getEffectiveSujetStatus(item.id)
          : getEffectiveSituationStatus(item.id);

    const previewMode = !!store.situationsView.commentPreviewMode;
    const helpMode = !!store.situationsView.helpMode;

    const hintHtml = `
      <div class="rapso-mention-hint comment-composer__hint">
        <span>Astuce : mentionne <span class="mono">@rapso</span> dans ton commentaire.</span>
      </div>
    `;

    const issueStatusActionHtml = renderIssueStatusAction(selection);

    const actionsHtml = `
      <button class="gh-btn gh-btn--help-mode ${helpMode ? "is-on" : ""}" data-action="toggle-help" type="button">Help</button>

      ${type === "avis" ? "" : issueStatusActionHtml}

      <button class="gh-btn gh-btn--comment" data-action="add-comment" type="button">Comment</button>
    `;

    return renderCommentComposer({
      title: "Add a comment",
      avatarHtml: SVG_AVATAR_HUMAN,
      previewMode,
      helpMode,
      textareaId: "humanCommentBox",
      previewId: "humanCommentPreview",
      placeholder: helpMode
        ? "Help (éphémère) — décrivez l’écran / l’action souhaitée."
        : "Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent. Ex: « @rapso peux-tu vérifier ce point ? »",
      hintHtml,
      actionsHtml
    });
  }

  return {
    addComment,
    addActivity,
    setDecision,
    getDecision,
    getThreadForSelection,
    renderThreadBlock,
    renderIssueStatusAction,
    renderCommentBox
  };
}
