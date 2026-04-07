import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

function normalizeClassName(value) {
  return String(value || "").trim();
}

export function renderSettingsModal({
  modalId = "settingsModal",
  title = "",
  bodyHtml = "",
  closeDataAttribute = "data-close-settings-modal",
  variant = "default",
  rootClassName = "",
  dialogClassName = "",
  bodyClassName = ""
} = {}) {
  const safeModalId = escapeHtml(modalId);
  const safeTitleId = escapeHtml(`${modalId}Title`);
  const safeCloseDataAttribute = escapeHtml(closeDataAttribute);
  const safeTitle = escapeHtml(title);

  const rootClasses = [
    "settings-modal",
    variant ? `settings-modal--${escapeHtml(variant)}` : "",
    normalizeClassName(rootClassName)
  ].filter(Boolean).join(" ");

  const dialogClasses = ["settings-modal__dialog", normalizeClassName(dialogClassName)].filter(Boolean).join(" ");
  const bodyClasses = ["settings-modal__body", normalizeClassName(bodyClassName)].filter(Boolean).join(" ");

  return `
    <div class="${rootClasses}" id="${safeModalId}">
      <div class="settings-modal__backdrop" ${safeCloseDataAttribute}="true"></div>

      <div class="${dialogClasses}" role="dialog" aria-modal="true" aria-labelledby="${safeTitleId}">
        <div class="settings-modal__head">
          <div id="${safeTitleId}" class="settings-modal__title">${safeTitle}</div>
          <button type="button" class="settings-modal__close" ${safeCloseDataAttribute}="true" aria-label="Fermer">
            ${svgIcon("x")}
          </button>
        </div>

        <div class="${bodyClasses}">
          ${bodyHtml}
        </div>
      </div>
    </div>
  `;
}
