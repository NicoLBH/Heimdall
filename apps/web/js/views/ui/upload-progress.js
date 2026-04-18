import { escapeHtml } from "../../utils/escape-html.js";

export function renderUploadProgressBar({
  progressPercent = 0,
  indeterminate = false,
  className = "",
  label = "Progression du chargement"
} = {}) {
  const normalized = Number.isFinite(Number(progressPercent))
    ? Math.max(0, Math.min(100, Math.round(Number(progressPercent))))
    : 0;
  const fillClassName = [
    "documents-upload-progress__bar-fill",
    indeterminate ? "is-indeterminate" : ""
  ].filter(Boolean).join(" ");

  const barClassName = ["documents-upload-progress__bar", className].filter(Boolean).join(" ");
  return `
    <div
      class="${barClassName}"
      role="progressbar"
      aria-label="${escapeHtml(label)}"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${indeterminate ? "0" : String(normalized)}"
      aria-valuetext="${indeterminate ? "Envoi en cours" : `${normalized}%`}"
    >
      <div class="${fillClassName}" style="width:${indeterminate ? "42%" : `${normalized}%`}"></div>
    </div>
  `;
}
