import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

export function renderDiscussionRow({
  id = "",
  title = "",
  categoryLabel = "",
  categoryIcon = "💬",
  author = "",
  kind = "started",
  updatedAtLabel = "",
  repliesCount = 0,
  isSelected = false
} = {}) {
  return `
    <article
      class="discussion-list__row ${isSelected ? "is-selected" : ""}"
      data-discussion-id="${escapeHtml(id)}"
      role="button"
      tabindex="0"
    >
      <div class="discussion-list__row-main">
        <div class="discussion-list__badge-wrap">
          <span class="discussion-list__badge">${svgIcon("arrow-up")}</span>
          <span class="discussion-list__badge-count mono">1</span>
        </div>

        <div class="discussion-list__icon-tile" aria-hidden="true">${escapeHtml(categoryIcon)}</div>

        <div class="discussion-list__body">
          <div class="discussion-list__title">${escapeHtml(title)}</div>
          <div class="discussion-list__meta">
            ${escapeHtml(author)} ${escapeHtml(kind)}
            ${updatedAtLabel ? `· ${escapeHtml(updatedAtLabel)}` : ""}
            ${categoryLabel ? `· dans ${escapeHtml(categoryLabel)}` : ""}
          </div>
        </div>
      </div>

      <div class="discussion-list__aside mono">
        <span class="discussion-list__aside-icon">${svgIcon("comment")}</span>
        <span>${escapeHtml(repliesCount)}</span>
      </div>
    </article>
  `;
}

export function renderDiscussionList({ rowsHtml = "" } = {}) {
  return `<section class="discussion-list">${rowsHtml}</section>`;
}

export function renderDiscussionEmptyState({
  title = "Aucune discussion.",
  description = "",
  actionLabel = "Nouvelle discussion"
} = {}) {
  return `
    <section class="discussion-empty-state">
      <div class="discussion-empty-state__icon">
        ${svgIcon("comment-discussion", { width: 24, height: 24 })}
      </div>

      <h3 class="discussion-empty-state__title">${escapeHtml(title)}</h3>

      ${description ? `<p class="discussion-empty-state__text">${escapeHtml(description)}</p>` : ""}

      <div class="discussion-empty-state__actions">
        <button
          type="button"
          class="gh-btn gh-btn--primary"
          data-discussion-action="new-discussion"
        >
          ${escapeHtml(actionLabel)}
        </button>
      </div>
    </section>
  `;
}
