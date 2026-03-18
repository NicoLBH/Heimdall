import { store } from "../store.js";
import { getRunLogEntries } from "./project-automation.js";
import { normalizeVerdict, normalizeReviewState } from "../views/ui/status-badges.js";

const HUMAN_STORE_KEY = "rapsobot-human-store-v2";
const MAX_PERIODS = 7;

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function nowTs() {
  return Date.now();
}

function coerceTimestamp(value, fallback = null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatDayKey(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayLabel(dayKey) {
  const date = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function loadHumanStore() {
  try {
    const raw = localStorage.getItem(HUMAN_STORE_KEY);
    if (!raw) return { runs: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { runs: {} };
  } catch {
    return { runs: {} };
  }
}

function getProjectBucket() {
  const all = loadHumanStore();
  const key = firstNonEmpty(
    store.currentProjectId,
    store.currentProject?.id,
    store.ui?.runId,
    store.situationsView?.rawResult?.run_id,
    store.situationsView?.rawResult?.runId,
    "default-project"
  );
  const bucket = all?.runs?.[key] || {
    comments: [],
    activities: [],
    descriptions: { avis: {}, sujet: {}, situation: {} },
    decisions: { avis: {}, sujet: {}, situation: {} },
    review: { avis: {}, sujet: {}, situation: {} }
  };
  return { key, bucket };
}

function flattenAvis() {
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  const avis = [];
  for (const situation of situations) {
    for (const sujet of situation?.sujets || []) {
      for (const item of sujet?.avis || []) {
        avis.push(item);
      }
    }
  }
  return avis;
}

function parseValidatedVerdict(decision) {
  const value = String(decision || "").toUpperCase();
  const match = value.match(/^VALIDATED_(F|D|S|HM|PM|SO|OK|KO|WARNING)$/);
  return match ? normalizeVerdict(match[1]) : "";
}

function buildCurrentAvisMap(bucket) {
  const map = new Map();
  for (const avis of flattenAvis()) {
    const sourceVerdict = normalizeVerdict(avis?.raw?.verdict || avis?.verdict || "");
    const effectiveVerdict = parseValidatedVerdict(bucket?.decisions?.avis?.[avis.id]?.decision) || sourceVerdict;
    map.set(String(avis.id), {
      id: String(avis.id),
      sourceVerdict,
      effectiveVerdict,
      status: String(avis?.status || "open").toLowerCase(),
      reviewState: normalizeReviewState(
        bucket?.review?.avis?.[avis.id]?.review_state || avis?.review_state || "pending"
      )
    });
  }
  return map;
}

function getAnalysisInsightFromEntry(entry) {
  const insight = entry?.details?.insights;
  if (!insight || typeof insight !== "object") return null;
  const avis = Array.isArray(insight.avis)
    ? insight.avis.map((item) => ({
        id: String(item?.id || ""),
        verdict: normalizeVerdict(item?.verdict || "")
      })).filter((item) => item.id)
    : [];

  return {
    totalAvis: Number(insight.totalAvis || avis.length || 0),
    criticalAvis: Number(insight.criticalAvis || 0),
    blockingAvis: Number(insight.blockingAvis || 0),
    avis
  };
}

function buildSyntheticInsight(bucket) {
  const currentAvis = [...buildCurrentAvisMap(bucket).values()];
  if (!currentAvis.length) return null;
  return {
    totalAvis: currentAvis.length,
    criticalAvis: currentAvis.filter((item) => item.sourceVerdict === "S" || item.sourceVerdict === "D").length,
    blockingAvis: currentAvis.filter((item) => item.sourceVerdict === "D").length,
    avis: currentAvis.map((item) => ({ id: item.id, verdict: item.sourceVerdict }))
  };
}

function getAnalysisSnapshots(bucket) {
  const runs = getRunLogEntries()
    .filter((entry) => String(entry?.kind || "").toLowerCase() === "analysis")
    .map((entry) => ({
      ts: coerceTimestamp(entry.endedAt, coerceTimestamp(entry.startedAt, nowTs())),
      insight: getAnalysisInsightFromEntry(entry)
    }))
    .filter((item) => item.insight && Number.isFinite(item.ts))
    .sort((a, b) => a.ts - b.ts);

  if (runs.length) return runs;

  const synthetic = buildSyntheticInsight(bucket);
  if (!synthetic) return [];

  return [{
    ts: coerceTimestamp(
      store.situationsView?.rawResult?.updated_at,
      coerceTimestamp(store.situationsView?.rawResult?.created_at, nowTs())
    ),
    insight: synthetic
  }];
}

function getReviewEvents(bucket) {
  const reviewEntries = bucket?.review?.avis || {};
  const currentAvisMap = buildCurrentAvisMap(bucket);
  const events = [];

  for (const [avisId, rawMeta] of Object.entries(reviewEntries)) {
    const meta = rawMeta && typeof rawMeta === "object" ? rawMeta : {};
    const reviewState = normalizeReviewState(meta.review_state || "pending");
    const ts = coerceTimestamp(
      meta.validated_at,
      coerceTimestamp(meta.rejected_at, coerceTimestamp(meta.dismissed_at, null))
    );
    if (!Number.isFinite(ts)) continue;

    const sourceVerdict = normalizeVerdict(meta.source_verdict || currentAvisMap.get(avisId)?.sourceVerdict || "");
    const effectiveVerdict = parseValidatedVerdict(bucket?.decisions?.avis?.[avisId]?.decision)
      || normalizeVerdict(meta.effective_verdict || currentAvisMap.get(avisId)?.effectiveVerdict || sourceVerdict);
    const modified = Boolean(meta.has_human_edit || bucket?.descriptions?.avis?.[avisId]?.is_human_edited)
      || Boolean(sourceVerdict && effectiveVerdict && sourceVerdict !== effectiveVerdict);
    const firstSeenAt = coerceTimestamp(meta.first_seen_at, null);

    events.push({
      avisId,
      ts,
      dayKey: formatDayKey(ts),
      reviewState,
      sourceVerdict,
      effectiveVerdict,
      modified,
      durationMs: Number.isFinite(firstSeenAt) && ts >= firstSeenAt ? ts - firstSeenAt : null
    });
  }

  return events.sort((a, b) => a.ts - b.ts);
}

function getPeriods(dayKeys = []) {
  const unique = [...new Set(dayKeys.filter(Boolean))].sort();
  const safe = unique.length ? unique.slice(-MAX_PERIODS) : [formatDayKey(nowTs())];
  return safe.map((dayKey, index) => ({ index, dayKey, label: formatDayLabel(dayKey) }));
}

function buildDailyIndex(periods) {
  const index = new Map();
  for (const period of periods) index.set(period.dayKey, period.index);
  return index;
}

function emptySeries(length, fill = 0) {
  return Array.from({ length }, () => fill);
}

function toPoints(values) {
  return values.map((value, index) => ({ x: index, y: Number(value || 0) }));
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

export function getProjectInsightsMetrics() {
  const { bucket } = getProjectBucket();
  const analysisSnapshots = getAnalysisSnapshots(bucket);
  const reviewEvents = getReviewEvents(bucket);

  const allDayKeys = [
    ...analysisSnapshots.map((item) => formatDayKey(item.ts)),
    ...reviewEvents.map((item) => item.dayKey)
  ];
  const periods = getPeriods(allDayKeys);
  const dailyIndex = buildDailyIndex(periods);
  const length = periods.length;

  const confidenceValidated = emptySeries(length);
  const confidenceModified = emptySeries(length);
  const confidenceRejected = emptySeries(length);
  const validationDurationSum = emptySeries(length);
  const validationDurationCount = emptySeries(length);
  const criticalRate = emptySeries(length);
  const flowCreated = emptySeries(length);
  const flowResolved = emptySeries(length);
  const activityRuns = emptySeries(length);
  const activityAvis = emptySeries(length);
  const activityValidations = emptySeries(length);

  for (const event of reviewEvents) {
    const idx = dailyIndex.get(event.dayKey);
    if (idx == null) continue;

    if (event.reviewState === "validated") {
      if (event.modified) confidenceModified[idx] += 1;
      else confidenceValidated[idx] += 1;
    } else if (event.reviewState === "rejected" || event.reviewState === "dismissed") {
      confidenceRejected[idx] += 1;
    }

    if (Number.isFinite(event.durationMs)) {
      validationDurationSum[idx] += event.durationMs;
      validationDurationCount[idx] += 1;
    }

    flowResolved[idx] += 1;
    activityValidations[idx] += 1;
  }

  const snapshotSeriesByDay = new Map();
  for (const snapshot of analysisSnapshots) {
    const dayKey = formatDayKey(snapshot.ts);
    if (!dailyIndex.has(dayKey)) continue;
    snapshotSeriesByDay.set(dayKey, snapshot);

    const idx = dailyIndex.get(dayKey);
    flowCreated[idx] += Number(snapshot.insight.totalAvis || 0);
    activityRuns[idx] += 1;
    activityAvis[idx] += Number(snapshot.insight.totalAvis || 0);
    criticalRate[idx] = snapshot.insight.totalAvis
      ? clampPercent((Number(snapshot.insight.criticalAvis || 0) / Number(snapshot.insight.totalAvis || 1)) * 100)
      : 0;
  }

  const backlog = emptySeries(length);
  const blocking = emptySeries(length);
  const closureRate = emptySeries(length);

  let activeSnapshot = null;
  let activeAvisState = new Map();
  let reviewCursor = 0;

  for (const period of periods) {
    const dayKey = period.dayKey;
    const snapshot = snapshotSeriesByDay.get(dayKey) || null;
    if (snapshot) {
      activeSnapshot = snapshot;
      activeAvisState = new Map(
        (snapshot.insight.avis || []).map((item) => [String(item.id), {
          verdict: normalizeVerdict(item.verdict || ""),
          reviewed: false
        }])
      );
    }

    const periodEnd = coerceTimestamp(`${dayKey}T23:59:59`, nowTs());
    while (reviewCursor < reviewEvents.length && reviewEvents[reviewCursor].ts <= periodEnd) {
      const event = reviewEvents[reviewCursor];
      const target = activeAvisState.get(String(event.avisId));
      if (target) {
        target.reviewed = true;
      }
      reviewCursor += 1;
    }

    let pendingCount = 0;
    let pendingBlockingCount = 0;
    for (const item of activeAvisState.values()) {
      if (!item.reviewed) {
        pendingCount += 1;
        if (item.verdict === "D") pendingBlockingCount += 1;
      }
    }

    backlog[period.index] = pendingCount;
    blocking[period.index] = pendingBlockingCount;
    closureRate[period.index] = activeSnapshot?.insight?.totalAvis
      ? clampPercent(((Number(activeSnapshot.insight.totalAvis || 0) - pendingCount) / Number(activeSnapshot.insight.totalAvis || 1)) * 100)
      : 0;
  }

  const avgValidationMinutes = validationDurationSum.map((sum, index) => {
    const count = validationDurationCount[index];
    return count ? Number((sum / count / 60000).toFixed(2)) : 0;
  });

  const latest = length - 1;
  const currentConfidenceTotal = confidenceValidated[latest] + confidenceModified[latest] + confidenceRejected[latest];
  const currentConfidenceRate = currentConfidenceTotal
    ? Math.round((confidenceValidated[latest] / currentConfidenceTotal) * 100)
    : 0;

  return {
    periods,
    summary: {
      backlog: backlog[latest] || 0,
      blocking: blocking[latest] || 0,
      criticalRate: Math.round(criticalRate[latest] || 0),
      closureRate: Math.round(closureRate[latest] || 0),
      avgValidationMinutes: avgValidationMinutes[latest] || 0,
      confidenceRate: currentConfidenceRate
    },
    charts: {
      confidence: {
        type: "stacked-bars",
        title: "Confiance IA",
        subtitle: "Répartition des avis revus par humain : validés sans modification, modifiés, rejetés.",
        labels: periods.map((item) => item.label),
        series: [
          { label: "Validés sans modification", values: confidenceValidated },
          { label: "Validés avec modification", values: confidenceModified },
          { label: "Rejetés / non pertinents", values: confidenceRejected }
        ]
      },
      validationTime: {
        title: "Temps moyen de validation d’un avis",
        subtitle: "Calculé entre la première ouverture d’un avis et sa validation / son rejet.",
        yLabel: "minutes",
        labels: periods.map((item) => item.label),
        yMax: Math.max(...avgValidationMinutes, 1),
        series: [
          { label: "Temps moyen", values: avgValidationMinutes, fill: true }
        ]
      },
      backlogBlocking: {
        title: "Backlog d’avis et points bloquants",
        subtitle: "Avis encore à traiter et sous-ensemble défavorable encore non traité.",
        yLabel: "avis",
        labels: periods.map((item) => item.label),
        yMax: Math.max(...backlog, ...blocking, 1),
        series: [
          { label: "Avis à traiter", values: backlog, fill: true },
          { label: "Points bloquants", values: blocking }
        ]
      },
      criticalRate: {
        title: "Taux d’avis critiques",
        subtitle: "Part des avis S + D dans les snapshots d’analyse disponibles.",
        yLabel: "%",
        labels: periods.map((item) => item.label),
        yMax: 100,
        series: [
          { label: "Taux critique", values: criticalRate, fill: true }
        ]
      },
      flow: {
        title: "Flux d’avis",
        subtitle: "Avis générés par l’analyse et avis résolus par les utilisateurs sur la période.",
        yLabel: "avis",
        labels: periods.map((item) => item.label),
        yMax: Math.max(...flowCreated, ...flowResolved, 1),
        series: [
          { label: "Avis générés", values: flowCreated },
          { label: "Avis résolus", values: flowResolved }
        ]
      },
      closureRate: {
        title: "Taux de fermeture",
        subtitle: "Part du backlog courant déjà traité depuis le dernier snapshot d’analyse.",
        yLabel: "%",
        labels: periods.map((item) => item.label),
        yMax: 100,
        series: [
          { label: "Taux de fermeture", values: closureRate, fill: true }
        ]
      },
      activity: {
        title: "Activité projet",
        subtitle: "Signal d’avancement : runs exécutés, avis générés et validations humaines.",
        yLabel: "volume",
        labels: periods.map((item) => item.label),
        yMax: Math.max(...activityRuns, ...activityAvis, ...activityValidations, 1),
        series: [
          { label: "Runs", values: activityRuns },
          { label: "Avis générés", values: activityAvis },
          { label: "Validations humaines", values: activityValidations }
        ]
      }
    }
  };
}
