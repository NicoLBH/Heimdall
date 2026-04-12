import { escapeHtml } from "../../utils/escape-html.js";

export function renderSpinnerHtml(options = {}) {
  const className = String(options.className || "").trim();
  const label = String(options.label || "Chargement").trim() || "Chargement";
  const sizeClass = String(options.size || "md").trim();
  const classes = ["ui-spinner", `ui-spinner--${escapeHtml(sizeClass)}`, className].filter(Boolean).join(" ");

  return `
    <span class="${classes}" role="status" aria-label="${escapeHtml(label)}">
      <span class="ui-spinner__ring" aria-hidden="true"></span>
    </span>
  `;
}
