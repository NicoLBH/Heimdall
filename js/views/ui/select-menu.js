import { escapeHtml } from "../../utils/escape-html.js";

export function renderSelectMenuItems(items = []) {
  return items.map((item) => {
    const key = escapeHtml(String(item?.key || ""));
    const classes = ["select-menu__item", item?.isActive ? "is-active" : "", item?.isSelected ? "is-selected" : ""]
      .filter(Boolean)
      .join(" ");
    const dataAttrs = Object.entries(item?.dataAttrs || {})
      .map(([attr, value]) => `data-${escapeHtml(String(attr))}="${escapeHtml(String(value ?? ""))}"`)
      .join(" ");
    return `
      <button type="button" class="${classes}" role="option" aria-selected="${item?.isSelected ? "true" : "false"}" data-select-menu-item="${key}" ${dataAttrs}>
        <span class="select-menu__item-mainrow">
          ${item?.iconHtml ? `<span class="select-menu__item-icon" aria-hidden="true">${item.iconHtml}</span>` : ""}
          <span class="select-menu__item-content">
            <span class="select-menu__item-title">${item?.titleHtml || escapeHtml(String(item?.title || ""))}</span>
            ${item?.metaHtml ? `<span class="select-menu__item-meta">${item.metaHtml}</span>` : ""}
          </span>
          ${item?.rightHtml ? `<span class="select-menu__item-right">${item.rightHtml}</span>` : ""}
        </span>
      </button>
    `;
  }).join("");
}

export function renderSelectMenuSection({ title = "", items = [], emptyTitle = "Aucun élément", emptyHint = "" } = {}) {
  const bodyHtml = items.length
    ? renderSelectMenuItems(items)
    : `
      <div class="select-menu__empty">
        <div class="select-menu__empty-title">${escapeHtml(emptyTitle)}</div>
        ${emptyHint ? `<div class="select-menu__empty-hint">${escapeHtml(emptyHint)}</div>` : ""}
      </div>
    `;

  return `
    <section class="select-menu__section">
      ${title ? `<div class="select-menu__section-title">${escapeHtml(title)}</div>` : ""}
      <div class="select-menu__section-body" role="listbox">
        ${bodyHtml}
      </div>
    </section>
  `;
}
