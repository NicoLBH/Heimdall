import { store } from "../store.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function flattenSubjects(subjects = [], acc = []) {
  for (const subject of safeArray(subjects)) {
    acc.push(subject);
    flattenSubjects(subject?.children, acc);
  }
  return acc;
}

function getAllSubjects() {
  const subjects = [];
  for (const situation of safeArray(store.situationsView?.data)) {
    flattenSubjects(situation?.sujets, subjects);
  }
  return subjects;
}

function getRunLogDates() {
  const entries = safeArray(store.projectAutomation?.runLog);
  const dates = entries
    .map((entry) => new Date(entry?.finishedAt || entry?.startedAt || entry?.createdAt || Date.now()))
    .filter((date) => Number.isFinite(date.getTime()));

  if (!dates.length) {
    dates.push(new Date());
  }

  return dates.sort((left, right) => left - right);
}

function formatLabel(date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function zeroes(length) {
  return Array.from({ length }, () => 0);
}

export function getProjectInsightsMetrics() {
  const subjects = getAllSubjects();
  const runDates = getRunLogDates();
  const labels = runDates.map(formatLabel);

  const totalSubjects = subjects.length;
  const openSubjects = subjects.filter((subject) => String(subject?.status || "open").toLowerCase() !== "closed").length;
  const closedSubjects = Math.max(0, totalSubjects - openSubjects);
  const criticalSubjects = subjects.filter((subject) => String(subject?.priority || "").toLowerCase() === "critical").length;
  const highOrCriticalSubjects = subjects.filter((subject) => {
    const priority = String(subject?.priority || "").toLowerCase();
    return priority === "high" || priority === "critical";
  }).length;
  const rootSubjects = subjects.filter((subject) => !subject?.parentSubjectId && !subject?.parent_subject_id).length;
  const childSubjects = Math.max(0, totalSubjects - rootSubjects);

  const runCountSeries = zeroes(labels.length);
  const createdSubjectSeries = zeroes(labels.length);
  const closedSubjectSeries = zeroes(labels.length);
  const openBacklogSeries = zeroes(labels.length);
  const criticalSeries = zeroes(labels.length);
  const hierarchySeries = zeroes(labels.length);
  const highPrioritySeries = zeroes(labels.length);

  safeArray(store.projectAutomation?.runLog).forEach((entry, index) => {
    const targetIndex = Math.min(index, labels.length - 1);
    if (targetIndex >= 0) runCountSeries[targetIndex] += 1;
  });

  labels.forEach((_, index) => {
    createdSubjectSeries[index] = totalSubjects;
    closedSubjectSeries[index] = closedSubjects;
    openBacklogSeries[index] = openSubjects;
    criticalSeries[index] = criticalSubjects;
    hierarchySeries[index] = childSubjects;
    highPrioritySeries[index] = highOrCriticalSubjects;
  });

  const closureRate = totalSubjects > 0 ? Math.round((closedSubjects / totalSubjects) * 100) : 0;
  const criticalRate = totalSubjects > 0 ? Math.round((criticalSubjects / totalSubjects) * 100) : 0;

  return {
    summary: {
      activeSituations: safeArray(store.situationsView?.data).filter((situation) => String(situation?.status || "open").toLowerCase() !== "closed").length,
      childSubjects,
      backlog: openSubjects,
      blocking: highOrCriticalSubjects,
      criticalRate,
      closureRate
    },
    charts: {
      confidence: {
        title: "Répartition du backlog",
        subtitle: "Répartition actuelle des sujets ouverts, fermés et critiques.",
        labels,
        series: [
          { label: "Sujets ouverts", values: openBacklogSeries },
          { label: "Sujets fermés", values: closedSubjectSeries },
          { label: "Sujets critiques", values: criticalSeries }
        ]
      },
      validationTime: {
        title: "Structure hiérarchique",
        subtitle: "Comparaison entre sujets racines et sous-sujets.",
        yLabel: "sujets",
        labels,
        yMax: Math.max(rootSubjects, childSubjects, 1),
        series: [
          { label: "Sujets racines", values: zeroes(labels.length).map(() => rootSubjects) },
          { label: "Sous-sujets", values: hierarchySeries, fill: true }
        ]
      },
      backlogBlocking: {
        title: "Backlog et priorités hautes",
        subtitle: "Volume ouvert et sous-ensemble haute priorité ou critique.",
        yLabel: "sujets",
        labels,
        yMax: Math.max(...openBacklogSeries, ...highPrioritySeries, 1),
        series: [
          { label: "Backlog ouvert", values: openBacklogSeries, fill: true },
          { label: "Priorité haute/critique", values: highPrioritySeries }
        ]
      },
      criticalRate: {
        title: "Taux critique",
        subtitle: "Part des sujets critiques dans le périmètre courant.",
        yLabel: "%",
        labels,
        yMax: 100,
        series: [
          { label: "Taux critique", values: zeroes(labels.length).map(() => criticalRate), fill: true }
        ]
      },
      flow: {
        title: "Flux de sujets",
        subtitle: "Total détecté versus sous-ensemble déjà fermé.",
        yLabel: "sujets",
        labels,
        yMax: Math.max(...createdSubjectSeries, ...closedSubjectSeries, 1),
        series: [
          { label: "Sujets détectés", values: createdSubjectSeries },
          { label: "Sujets fermés", values: closedSubjectSeries }
        ]
      },
      closureRate: {
        title: "Taux de fermeture",
        subtitle: "Part des sujets fermés dans le snapshot courant.",
        yLabel: "%",
        labels,
        yMax: 100,
        series: [
          { label: "Taux de fermeture", values: zeroes(labels.length).map(() => closureRate), fill: true }
        ]
      },
      activity: {
        title: "Activité projet",
        subtitle: "Runs exécutés, sujets totaux et sous-sujets.",
        yLabel: "volume",
        labels,
        yMax: Math.max(...runCountSeries, ...createdSubjectSeries, ...hierarchySeries, 1),
        series: [
          { label: "Runs", values: runCountSeries },
          { label: "Sujets", values: createdSubjectSeries },
          { label: "Sous-sujets", values: hierarchySeries }
        ]
      }
    }
  };
}
