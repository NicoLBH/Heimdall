import { escapeHtml } from "../../utils/escape-html.js";

function sanitizeToken(value, fallback = "") {
  const safe = String(value || fallback || "").trim();
  return safe.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function renderDetailChrome({
  className = "",
  width = "wide",
  stickyId = "",
  stickyTitleHtml = "",
  stickyMetaHtml = "",
  bodyHtml = "",
  bodyClassName = "",
  innerClassName = "",
  stickyClassName = ""
} = {}) {
  const safeWidth = sanitizeToken(width, "wide") || "wide";

  return `
    <section class="detail-chrome detail-chrome--${escapeHtml(safeWidth)} ${escapeHtml(className)}">
      <header
        class="detail-chrome__sticky ${escapeHtml(stickyClassName)}"
        ${stickyId ? `id="${escapeHtml(stickyId)}"` : ""}
      >
        <div class="detail-chrome__sticky-inner">
          ${stickyTitleHtml ? `<div class="detail-chrome__sticky-titlebar">${stickyTitleHtml}</div>` : ""}
          ${stickyMetaHtml ? `<div class="detail-chrome__sticky-metabar">${stickyMetaHtml}</div>` : ""}
        </div>
      </header>

      <div class="detail-chrome__body ${escapeHtml(bodyClassName)}">
        <div class="detail-chrome__inner ${escapeHtml(innerClassName)}">
          ${bodyHtml}
        </div>
      </div>
    </section>
  `;
}

export function bindDetailChromeCompact({
  scrollEl,
  chromeEl,
  threshold = 56,
  compactClassName = "is-compact",
  onCompactChange = null
} = {}) {
  if (!scrollEl || !chromeEl) return () => {};

  const sync = () => {
    const isCompact = (scrollEl.scrollTop || 0) > threshold;
    chromeEl.classList.toggle(compactClassName, isCompact);
    onCompactChange?.(isCompact);
  };

  scrollEl.addEventListener("scroll", sync, { passive: true });
  sync();
  setTimeout(sync, 0);

  return () => {
    scrollEl.removeEventListener("scroll", sync);
    chromeEl.classList.remove(compactClassName);
    onCompactChange?.(false);
  };
}
