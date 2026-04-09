export const HUMAN_STORE_KEY = "rapsobot-human-store-v2";

export function createProjectSubjectsLegacyRapso(deps = {}) {
  const {
    store,
    ASK_LLM_URL_PROD,
    escapeHtml,
    renderMessageThreadComment,
    nowIso,
    fmtTs,
    mdToHtml,
    SVG_AVATAR_HUMAN,
    firstNonEmpty,
    getRunBucket,
    getNestedSituation,
    getSituationBySujetId,
    getSituationByAvisId,
    getNestedSujet,
    getSujetByAvisId,
    getNestedAvis,
    getEffectiveSituationStatus,
    getEffectiveSujetStatus,
    getEffectiveAvisVerdict,
    addComment,
    persistRunBucket,
    rerenderPanels,
    showError = console.error
  } = deps;

  function updateCommentByRequestId(requestId, nextMessage, options = {}) {
    if (!requestId) return;
    persistRunBucket((bucket) => {
      const comments = Array.isArray(bucket.comments) ? bucket.comments : [];
      const target = [...comments].reverse().find((entry) => String(entry?.request_id || "") === String(requestId));
      if (!target) return;
      target.message = String(nextMessage || "");
      target.pending = !!options.pending;
      if (options.agent) target.agent = options.agent;
      if (options.actor) target.actor = options.actor;
    });
  }

  function stripRapsoTag(text) {
    return String(text || "").replace(/@rapso\b/gi, "").replace(/\s{2,}/g, " ").trim();
  }

  function isHelpTrigger(text) {
    const t = String(text || "").trim();
    return /^\/help\b/i.test(t) || /^@help\b/i.test(t);
  }

  function stripHelpTag(text) {
    return String(text || "")
      .replace(/^\s*\/help\b\s*/i, "")
      .replace(/^\s*@help\b\s*/i, "")
      .trim();
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function buildUiSnapshot({ scope = "unknown", type = null, id = null } = {}) {
    return {
      scope,
      now: nowIso(),
      display_depth: store.situationsView.displayDepth || "situations",
      filters: {
        verdict: store.situationsView.verdictFilter || "ALL",
        search: store.situationsView.search || ""
      },
      selection: {
        situation_id: store.situationsView.selectedSituationId || null,
        sujet_id: store.situationsView.selectedSujetId || null,
        avis_id: store.situationsView.selectedAvisId || null,
        type: type || null,
        id: id || null
      }
    };
  }

  function buildRapsoContextBundle(type, id, humanMessage) {
    const rawResult = store.situationsView?.rawResult || null;
    const nestedData = Array.isArray(store.situationsView?.data) ? store.situationsView.data : null;
    if (!rawResult && !nestedData) return null;

    const localType = String(type || "");
    const rapsoType = localType === "sujet" ? "problem" : localType;
    const scope = { type: rapsoType, id };

    const situationsRaw = Array.isArray(rawResult?.situations) ? rawResult.situations : [];
    const problemsRaw = Array.isArray(rawResult?.problems) ? rawResult.problems : [];
    const avisRaw = Array.isArray(rawResult?.avis) ? rawResult.avis : [];

    const summarizeOneLine = (value, maxLen = 220) => {
      const t = String(value || "").replace(/\s+/g, " ").trim();
      if (!t) return "";
      return t.length > maxLen ? `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…` : t;
    };

    const idFromAny = (value) => {
      if (value == null) return "";
      if (typeof value === "string" || typeof value === "number") return String(value);
      if (typeof value === "object") {
        return firstNonEmpty(
          value.avis_id,
          value.problem_id,
          value.situation_id,
          value.id,
          value.uid,
          value.pk,
          ""
        );
      }
      return "";
    };

    const situationById = new Map();
    for (const situation of situationsRaw) {
      const situationId = firstNonEmpty(situation?.situation_id, situation?.id);
      if (situationId) situationById.set(String(situationId), situation);
    }

    const problemById = new Map();
    for (const problem of problemsRaw) {
      const problemId = firstNonEmpty(problem?.problem_id, problem?.id);
      if (problemId) problemById.set(String(problemId), problem);
    }

    const avisById = new Map();
    for (const avisEntry of avisRaw) {
      const avisId = firstNonEmpty(avisEntry?.avis_id, avisEntry?.id);
      if (avisId) avisById.set(String(avisId), avisEntry);
    }

    const situationNested = localType === "situation"
      ? getNestedSituation(id)
      : (localType === "sujet" ? getSituationBySujetId(id) : getSituationByAvisId(id));
    const problemNested = localType === "sujet"
      ? getNestedSujet(id)
      : (localType === "avis" ? getSujetByAvisId(id) : null);
    const avisNested = localType === "avis" ? getNestedAvis(id) : null;

    const rawSituationId = firstNonEmpty(
      situationNested?.raw?.situation_id,
      situationNested?.raw?.id,
      situationNested?.id,
      ""
    );
    const rawProblemId = firstNonEmpty(
      problemNested?.raw?.problem_id,
      problemNested?.raw?.id,
      problemNested?.id,
      ""
    );
    const rawAvisId = firstNonEmpty(
      avisNested?.raw?.avis_id,
      avisNested?.raw?.id,
      avisNested?.id,
      ""
    );

    const currentSituation = rawSituationId
      ? (situationById.get(String(rawSituationId)) || situationNested?.raw || null)
      : (situationNested?.raw || null);
    const currentProblem = rawProblemId
      ? (problemById.get(String(rawProblemId)) || problemNested?.raw || null)
      : (problemNested?.raw || null);
    const currentAvis = rawAvisId
      ? (avisById.get(String(rawAvisId)) || avisNested?.raw || null)
      : (avisNested?.raw || null);

    const situationLite = (s) => s ? ({
      situation_id: firstNonEmpty(s.situation_id, s.id, rawSituationId, ""),
      status: String(
        getEffectiveSituationStatus(firstNonEmpty(s.situation_id, s.id, rawSituationId, "")) || firstNonEmpty(s.status, "open")
      ).toLowerCase(),
      title: firstNonEmpty(s.title, s.label, s.name, s.situation, s.topic, rawSituationId, "(sans titre)"),
      summary: summarizeOneLine(firstNonEmpty(s.summary, s.description, s.message, ""), 220),
      priority: firstNonEmpty(s.priority, s.prio, "")
    }) : null;

    const problemLite = (p) => p ? ({
      sujet_id: firstNonEmpty(p.problem_id, p.id, rawProblemId, ""),
      status: String(
        getEffectiveSujetStatus(firstNonEmpty(p.problem_id, p.id, rawProblemId, "")) || firstNonEmpty(p.status, "open")
      ).toLowerCase(),
      topic: firstNonEmpty(p.topic, p.title, p.label, p.name, p.problem, "Non classé"),
      summary: summarizeOneLine(firstNonEmpty(p.summary, p.why_grouped, p.description, ""), 220),
      priority: firstNonEmpty(p.priority, p.prio, "")
    }) : null;

    const avisFull = (a, fallbackId = "") => a ? ({
      avis_id: firstNonEmpty(a.avis_id, a.id, fallbackId, ""),
      topic: firstNonEmpty(a.topic, a.title, a.label, a.name, ""),
      verdict: getEffectiveAvisVerdict(firstNonEmpty(a.avis_id, a.id, fallbackId, "")),
      severity: firstNonEmpty(a.severity, ""),
      confidence: a.confidence ?? null,
      source: firstNonEmpty(a.source, ""),
      agent: firstNonEmpty(a.agent, currentProblem?.agent, problemNested?.agent, "system"),
      message: firstNonEmpty(a.message, a.summary, ""),
      evidence: a.evidence ?? null
    }) : null;

    const avisLite = (a, fallbackId = "") => a ? ({
      avis_id: firstNonEmpty(a.avis_id, a.id, fallbackId, ""),
      verdict: getEffectiveAvisVerdict(firstNonEmpty(a.avis_id, a.id, fallbackId, "")),
      severity: firstNonEmpty(a.severity, ""),
      summary: summarizeOneLine(firstNonEmpty(a.topic, a.title, a.message, a.summary, ""), 140)
    }) : null;

    const thread_recent = (() => {
      const { bucket } = getRunBucket();
      const comments = Array.isArray(bucket?.comments) ? bucket.comments : [];
      return comments
        .filter((entry) => String(entry?.type || "").toUpperCase() === "COMMENT")
        .filter((entry) => String(entry?.entity_type || "") === String(localType) && String(entry?.entity_id || "") === String(id))
        .slice(-10)
        .map((entry) => ({
          ts: entry.ts,
          actor: entry.actor,
          agent: entry.agent,
          message: entry.message
        }));
    })();

    const cadre = {
      description: [
        "RAPSOBOT est un PoC qui structure une analyse CT en hiérarchie Situation → Sujet → Avis, à partir d'une note de calcul PS.",
        "specialist_ps agit comme conseiller technique en mission PS (Eurocode 8 + NA FR + Arrêté 22/10/2010), en appui à la décision.",
        "Les verdicts D/S/OK qualifient le niveau de conformité / risque (D = non-conformité ou risque majeur ; S = point bloquant/incomplet à clarifier ; OK = conforme).",
        "Ne pas 'modifier' les avis : proposer des corrections, préciser hypothèses, et recommander les actions/compléments à produire."
      ].join("\n"),
      response_format: {
        required_sections: [
          "1. Analyse technique",
          "2. Risque identifié",
          "3. Impact projet",
          "4. Recommandations (actions + références EC8 si pertinent)"
        ],
        style: "Précis, factuel, orienté décision. Citer EC8/NA si utile. Pas de blabla."
      }
    };

    let context_structured = null;

    if (localType === "avis") {
      const parentSituation = situationLite(currentSituation);
      const parentProblem = problemLite(currentProblem);
      const curAvis = avisFull(currentAvis, rawAvisId);

      const siblingIds = Array.isArray(currentProblem?.avis_ids) ? currentProblem.avis_ids : [];
      const avis_freres = siblingIds
        .map((avisId) => {
          const cleanId = idFromAny(avisId);
          return { cleanId, raw: avisById.get(String(cleanId)) || null };
        })
        .filter((entry) => entry.raw)
        .filter((entry) => String(entry.cleanId) !== String(rawAvisId))
        .map((entry) => avisLite(entry.raw, entry.cleanId))
        .slice(0, 50);

      const hierarchy_text = [
        "PROJET",
        parentSituation ? `  Situation ${parentSituation.situation_id} (${parentSituation.status})` : "  Situation —",
        parentProblem ? `    Sujet ${parentProblem.sujet_id} (${parentProblem.status})` : "    Sujet —",
        curAvis ? `      Avis ${curAvis.avis_id} (${curAvis.verdict || "—"})` : "      Avis —"
      ].join("\n");

      context_structured = {
        hierarchy_text,
        situation: parentSituation,
        sujet: parentProblem,
        avis: curAvis,
        avis_freres
      };
    } else if (localType === "sujet") {
      const parentSituation = situationLite(currentSituation);
      const curProblem = problemLite(currentProblem);

      const childIds = Array.isArray(currentProblem?.avis_ids) ? currentProblem.avis_ids : [];
      const avisChildrenAll = childIds
        .map((avisId) => {
          const cleanId = idFromAny(avisId);
          return { cleanId, raw: avisById.get(String(cleanId)) || null };
        })
        .filter((entry) => entry.raw);

      const avis_fils = avisChildrenAll.length <= 5
        ? avisChildrenAll.map((entry) => avisFull(entry.raw, entry.cleanId))
        : avisChildrenAll.map((entry) => avisLite(entry.raw, entry.cleanId));

      const hierarchy_text = [
        "PROJET",
        parentSituation ? `  Situation ${parentSituation.situation_id} (${parentSituation.status})` : "  Situation —",
        curProblem ? `    Sujet ${curProblem.sujet_id} (${curProblem.status})` : "    Sujet —"
      ].join("\n");

      context_structured = {
        hierarchy_text,
        situation: parentSituation,
        sujet: curProblem,
        avis_fils
      };
    } else if (localType === "situation") {
      const curSituation = currentSituation ? ({
        ...situationLite(currentSituation),
        key_conflict_ids: Array.isArray(currentSituation.key_conflict_ids) ? currentSituation.key_conflict_ids.slice(0, 25) : []
      }) : null;

      const problemIds = Array.isArray(currentSituation?.problem_ids) ? currentSituation.problem_ids : [];
      const sujets_fils = problemIds
        .map((problemId) => {
          const cleanId = idFromAny(problemId);
          const rawProblem = problemById.get(String(cleanId)) || null;
          if (!rawProblem) return null;
          const avisIds = Array.isArray(rawProblem.avis_ids) ? rawProblem.avis_ids : [];
          let dCount = 0;
          let sCount = 0;
          let okCount = 0;
          for (const avisId of avisIds) {
            const v = String(getEffectiveAvisVerdict(idFromAny(avisId)) || "").toUpperCase();
            if (v === "D") dCount += 1;
            else if (v === "S") sCount += 1;
            else if (v === "OK" || v === "F") okCount += 1;
          }
          return {
            sujet_id: firstNonEmpty(rawProblem.problem_id, rawProblem.id, cleanId, ""),
            status: String(
              getEffectiveSujetStatus(firstNonEmpty(rawProblem.problem_id, rawProblem.id, cleanId, "")) || firstNonEmpty(rawProblem.status, "open")
            ).toLowerCase(),
            topic: firstNonEmpty(rawProblem.topic, rawProblem.title, rawProblem.label, rawProblem.name, "Non classé"),
            nb_avis: avisIds.length,
            ratio_D_S_OK: `${dCount}/${sCount}/${okCount}`,
            description: summarizeOneLine(firstNonEmpty(rawProblem.summary, rawProblem.why_grouped, rawProblem.description, ""), 180)
          };
        })
        .filter(Boolean)
        .slice(0, 80);

      const hierarchy_text = [
        "PROJET",
        curSituation ? `  Situation ${curSituation.situation_id} (${curSituation.status})` : "  Situation —"
      ].join("\n");

      context_structured = {
        hierarchy_text,
        situation: curSituation,
        sujets_fils
      };
    } else {
      context_structured = { hierarchy_text: "PROJET" };
    }

    return {
      run_id: firstNonEmpty(rawResult?.run_id, rawResult?.runId, store.ui?.runId, null),
      agent: "specialist_ps",
      scope,
      cadre,
      context_structured,
      thread_recent,
      user_message: stripRapsoTag(humanMessage)
    };
  }

  function _extractJsonFromFencedBlock(s) {
    const t = String(s || "").trim();
    const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    return m ? String(m[1] || "").trim() : null;
  }

  function _tryParseJson(s) {
    const t = String(s || "").trim();
    if (!t) return null;
    try { return JSON.parse(t); } catch { return null; }
  }

  function _unwrapOpenAIResponsesText(out) {
    try {
      if (!out || typeof out !== "object") return null;
      const arr = Array.isArray(out.output) ? out.output : null;
      if (!arr?.length) return null;
      const msg = arr.find((x) => x && x.type === "message") || arr[0];
      const content = Array.isArray(msg?.content) ? msg.content : null;
      if (!content?.length) return null;
      const ot = content.find((c) => c && (c.type === "output_text" || c.type === "text")) || content[0];
      const t = typeof ot?.text === "string" ? ot.text : null;
      return t && t.trim() ? t : null;
    } catch {
      return null;
    }
  }

  function _normalizeLlmRawToObject(rawText) {
    const direct = _tryParseJson(rawText);
    if (direct) return direct;
    const inner = _extractJsonFromFencedBlock(rawText);
    if (inner) {
      const obj = _tryParseJson(inner);
      if (obj) return obj;
    }
    const t = String(rawText || "").trim();
    const i = t.indexOf("{");
    const j = t.lastIndexOf("}");
    if (i >= 0 && j > i) {
      const obj = _tryParseJson(t.slice(i, j + 1));
      if (obj) return obj;
    }
    return null;
  }

  function _pickReplyMarkdown(out, rawText) {
    if (out && typeof out === "object") {
      const r = out.reply_markdown ?? out.reply ?? out.message ?? out.content ?? "";
      if (typeof r === "string" && r.trim()) return r.trim();
      const wrapped = _unwrapOpenAIResponsesText(out);
      if (wrapped) {
        const obj = _normalizeLlmRawToObject(wrapped);
        if (obj) return _pickReplyMarkdown(obj, null);
        return wrapped.trim();
      }
    }
    const obj = rawText ? _normalizeLlmRawToObject(rawText) : null;
    if (obj) return _pickReplyMarkdown(obj, null);
    return String(rawText || "").trim();
  }

  function _helpFurtiveCommentHtml({ role = "assistant", bodyMd = "", pending = false } = {}) {
    const who = role === "user" ? "Vous (Help)" : "Rapso (Help)";
    const tsHtml = `<div class="mono-small">${escapeHtml(fmtTs(nowIso()))}</div>`;
    const cleanMd = String(bodyMd || "").replace(/^_+|_+$/g, "");
    const bodyHtml = pending
      ? `<div><div class="rapso-wait"><span class="rapso-spinner" aria-hidden="true"></span><span class="rapso-shimmer">${escapeHtml(cleanMd || "RAPSOBOT réfléchit…")}</span></div></div>`
      : mdToHtml(cleanMd);

    return renderMessageThreadComment({
      author: who,
      tsHtml,
      bodyHtml,
      avatarType: role === "user" ? "human" : "agent",
      avatarHtml: role === "user" ? SVG_AVATAR_HUMAN : "",
      avatarInitial: role === "user" ? "H" : "R",
      boxClassName: "gh-comment-box--help",
      headerClassName: "gh-comment-header--help",
      bodyClassName: "gh-comment-body--help"
    });
  }

  function showEphemeralHelpThread(rootEl, { userMd, assistantPendingMd = "RAPSOBOT réfléchit…", ttlMs = 60000 } = {}) {
    if (!rootEl) return null;
    const anchor = rootEl.querySelector(".gh-thread") || rootEl;
    const wrap = document.createElement("div");
    wrap.className = "help-ephemeral";
    wrap.innerHTML = `${_helpFurtiveCommentHtml({ role: "user", bodyMd: userMd || "" })}<div class="help-ephemeral__reply">${_helpFurtiveCommentHtml({ role: "assistant", bodyMd: assistantPendingMd || "", pending: true })}</div>`;
    try {
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
      else rootEl.appendChild(wrap);
    } catch {
      try { rootEl.appendChild(wrap); } catch {}
    }
    const timer = setTimeout(() => { try { wrap.remove(); } catch {} }, ttlMs);
    return { wrap, timer };
  }

  async function askRapsoAndAppendReply({ type, id, humanMessage }) {
    const ctx = buildRapsoContextBundle(type, id, humanMessage);
    if (!ctx) return;
    const requestId = `rapso_${Date.now()}_${type}_${id}`;
    addComment(type, id, "RAPSOBOT est en train de réfléchir…", {
      actor: "RAPSOBOT",
      agent: "specialist_ps",
      pending: true,
      request_id: requestId,
      meta: { from_webhook: true }
    });
    rerenderPanels();
    const payload = { agent: "specialist_ps", request_id: requestId, context: ctx };
    try {
      const res = await fetchWithTimeout(ASK_LLM_URL_PROD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 120000);
      const txt = await res.text();
      let out = null;
      try { out = JSON.parse(txt); } catch { out = null; }
      const reply = _pickReplyMarkdown(out, txt) || "_(no reply)_";
      updateCommentByRequestId(requestId, reply, { pending: false, actor: "RAPSOBOT", agent: "specialist_ps" });
      rerenderPanels();
    } catch (e) {
      const errMsg = e?.message || String(e);
      updateCommentByRequestId(requestId, `_(error: ${errMsg})_`, { pending: false, actor: "RAPSOBOT", agent: "specialist_ps" });
      rerenderPanels();
      showError(`@rapso: échec de l'appel LLM (${errMsg})`);
    }
  }

  async function askHelpEphemeral({ rootEl, type, id, humanMessage, scope = "details" } = {}) {
    const raw = String(humanMessage || "").trim();
    const q = stripHelpTag(raw) || "Explique-moi ce que je peux faire ici.";
    const ctx = buildRapsoContextBundle(type, id, q);
    if (!ctx) return;
    ctx.help_mode = true;
    ctx.ui_snapshot = buildUiSnapshot({ scope, type, id });
    ctx.user_message = [
      "MODE_HELP: explique au format:",
      "1) Où suis-je (type + id + statut/verdict si dispo)",
      "2) Actions possibles ici",
      "3) Exemples de commandes courtes",
      "",
      q
    ].join("");
    const ui = showEphemeralHelpThread(rootEl, { userMd: q });
    if (!ui) return;
    const requestId = `help_${Date.now()}_${type}_${id}`;
    const payload = { agent: "specialist_ps", request_id: requestId, context: ctx };
    try {
      const res = await fetchWithTimeout(ASK_LLM_URL_PROD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 120000);
      const txt = await res.text();
      let out = null;
      try { out = JSON.parse(txt); } catch { out = null; }
      const reply = _pickReplyMarkdown(out, txt) || "_(no reply)_";
      const slot = ui.wrap.querySelector(".help-ephemeral__reply");
      if (slot) slot.innerHTML = _helpFurtiveCommentHtml({ role: "assistant", bodyMd: reply, pending: false });
    } catch (e) {
      const errMsg = e?.message || String(e);
      const slot = ui.wrap.querySelector(".help-ephemeral__reply");
      if (slot) slot.innerHTML = _helpFurtiveCommentHtml({ role: "assistant", bodyMd: `_(error: ${errMsg})_`, pending: false });
      showError(`Help: échec de l'appel LLM (${errMsg})`);
    }
  }

  return {
    isHelpTrigger,
    askRapsoAndAppendReply,
    askHelpEphemeral,
    buildRapsoContextBundle
  };
}
