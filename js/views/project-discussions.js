import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";

import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";

import {
  renderDiscussionEmptyState,
  renderDiscussionList,
  renderDiscussionRow
} from "./ui/discussion-list.js";

import { renderCommentComposer } from "./ui/comment-composer.js";

import {
  renderMessageThread,
  renderMessageThreadActivity,
  renderMessageThreadComment,
  renderMessageThreadEvent
} from "./ui/message-thread.js";

import {
  bindGhActionButtons,
  bindGhSelectMenus,
  renderGhActionButton
} from "./ui/gh-split-button.js";

import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSearch,
  renderProjectTableToolbarSelect
} from "./ui/project-table-toolbar.js";

const CATEGORY_META = [
  { id: "all", label: "Voir toutes les discussions", icon: "💬", description: "Toutes catégories" },
  { id: "announcements", label: "Annonces", icon: "📣", description: "Informations générales" },
  { id: "general", label: "Général", icon: "💭", description: "Échanges transverses" },
  { id: "ideas", label: "Idées", icon: "💡", description: "Améliorations et pistes" },
  { id: "polls", label: "Sondages", icon: "🗳️", description: "Votes et arbitrages" },
  { id: "qa", label: "Q&A", icon: "🙏", description: "Questions / réponses" },
  { id: "show", label: "Show and tell", icon: "🙌", description: "Démonstrations et partages" }
];

const DISCUSSIONS = [
  {
    id: "d1",
    categoryId: "ideas",
    title: "Partage de nouvelles idées pour de nouvelles fonctionnalités",
    author: "NicoLBH",
    kind: "started",
    isOpen: true,
    updatedAt: "2026-03-13T15:30:00",
    repliesCount: 0,
    body: "Je propose d'utiliser cet espace pour les idées produit qui ne relèvent pas encore d'un sujet formel.\n\nPremière piste : relier plus facilement une discussion à un **sujet**, une **situation** ou un **avis**.",
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-13T15:30:00",
        body: "Je propose d'utiliser cet espace pour les idées produit qui ne relèvent pas encore d'un sujet formel.\n\nPremière piste : relier plus facilement une discussion à un **sujet**, une **situation** ou un **avis**."
      },
      {
        type: "activity",
        text: "a lié cette discussion au sujet **PS-14 / Vérification des joints de fractionnement**",
        note: "Ce lien est seulement illustratif pour la phase UI.",
        at: "2026-03-13T16:10:00"
      }
    ]
  },
  {
    id: "d2",
    categoryId: "announcements",
    title: "Annonces générales",
    author: "NicoLBH",
    kind: "announced",
    isOpen: true,
    updatedAt: "2026-03-13T14:10:00",
    repliesCount: 0,
    body: "Canal réservé aux informations projet utiles mais non normatives : disponibilité des livrables, changements de planning, rappels de coordination.",
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-13T14:10:00",
        body: "Canal réservé aux informations projet utiles mais non normatives : disponibilité des livrables, changements de planning, rappels de coordination."
      }
    ]
  },
  {
    id: "d3",
    categoryId: "general",
    title: "Discussion générale sur le projet",
    author: "NicoLBH",
    kind: "started",
    isOpen: true,
    updatedAt: "2026-03-13T13:00:00",
    repliesCount: 0,
    body: "Espace libre pour les échanges transverses. Dès qu'un point devient structurant, on pourra le transformer en sujet.",
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-13T13:00:00",
        body: "Espace libre pour les échanges transverses. Dès qu'un point devient structurant, on pourra le transformer en sujet."
      },
      {
        type: "event",
        label: "INFO",
        head: "Pont prévu vers Sujets / Avis / Situations",
        body: "Une discussion ne remplace pas un objet métier. L'interface permettra plus tard de convertir un échange en élément pilotable."
      }
    ]
  }
];

const state = {
  selectedCategoryId: "all",
  selectedDiscussionId: "",
  search: "",
  sort: "latest",
  filter: "open",
  composerText: "",
  composerPreview: false,
  helpMode: false
};

function mdToHtml(text) {
  const safe = escapeHtml(text || "");
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);

  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getCategoryMeta(categoryId) {
  return CATEGORY_META.find((item) => item.id === categoryId) || CATEGORY_META[0];
}

function getFilteredDiscussions() {
  const q = String(state.search || "").trim().toLowerCase();

  let items = DISCUSSIONS.filter((item) => {
    if (state.selectedCategoryId !== "all" && item.categoryId !== state.selectedCategoryId) return false;
    if (state.filter === "open" && !item.isOpen) return false;
    if (state.filter === "closed" && item.isOpen) return false;

    if (!q) return true;

    return [item.title, item.author, item.body, getCategoryMeta(item.categoryId).label]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  items = items.slice().sort((a, b) => {
    if (state.sort === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
    if (state.sort === "title") return a.title.localeCompare(b.title, "fr");
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return items;
}

function getSelectedDiscussion() {
  return DISCUSSIONS.find((item) => item.id === state.selectedDiscussionId) || null;
}

function renderCategoryIcon(icon) {
  return `<span class="project-discussions__emoji" aria-hidden="true">${escapeHtml(icon || "💬")}</span>`;
}

function renderLeftNav() {
  return renderSideNavGroup({
    title: "Catégories",
    items: CATEGORY_META.map((item) =>
      renderSideNavItem({
        label: item.label,
        targetId: item.id,
        iconHtml: renderCategoryIcon(item.icon),
        isActive: state.selectedCategoryId === item.id,
        isPrimary: item.id === "all"
      })
    )
  });
}

function renderListToolbar() {
  const leftHtml = renderProjectTableToolbarGroup({
    html: renderProjectTableToolbarSearch({
      id: "projectDiscussionsSearch",
      value: state.search,
      placeholder: "Rechercher une discussion…"
    })
  });

  const rightHtml = [
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSelect({
        id: "projectDiscussionsSort",
        value: state.sort,
        options: [
          { value: "latest", label: "Latest activity" },
          { value: "oldest", label: "Oldest" },
          { value: "title", label: "Title" }
        ]
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSelect({
        id: "projectDiscussionsFilter",
        value: state.filter,
        options: [
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All" }
        ]
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderGhActionButton({
        id: "projectDiscussionsNew",
        label: "Nouvelle discussion",
        tone: "primary",
        mainAction: "new-discussion"
      })
    })
  ].join("");

  return renderProjectTableToolbar({
    leftHtml,
    rightHtml,
    className: "project-table-toolbar--discussions"
  });
}

function renderListView() {
  const category = getCategoryMeta(state.selectedCategoryId);
  const items = getFilteredDiscussions();

  if (!items.length) {
    return `
      <section class="project-discussions__panel">
        <div class="project-discussions__title-row">
          <h2 class="project-discussions__title">Discussions</h2>
        </div>

        ${renderListToolbar()}

        ${renderDiscussionEmptyState({
          title: "Aucune discussion correspondante.",
          description: state.selectedCategoryId === "all"
            ? "Crée une première discussion pour lancer les échanges du projet."
            : `Aucune discussion n'existe encore dans la catégorie ${category.label}.`,
          actionLabel: "Nouvelle discussion"
        })}
      </section>
    `;
  }

  return `
    <section class="project-discussions__panel">
      <div class="project-discussions__title-row">
        <h2 class="project-discussions__title">Discussions</h2>
      </div>

      ${renderListToolbar()}

      ${renderDiscussionList({
        rowsHtml: items.map((item) =>
          renderDiscussionRow({
            id: item.id,
            title: item.title,
            categoryLabel: getCategoryMeta(item.categoryId).label,
            categoryIcon: getCategoryMeta(item.categoryId).icon,
            author: item.author,
            kind: item.kind,
            updatedAtLabel: fmtTs(item.updatedAt),
            repliesCount: item.repliesCount,
            isSelected: false
          })
        ).join("")
      })}
    </section>
  `;
}

function renderTimelineItem(item, idx) {
  if (item.type === "activity") {
    return renderMessageThreadActivity({
      idx,
      iconHtml: `<span class="project-discussions__timeline-icon">${svgIcon("comment-discussion")}</span>`,
      textHtml: mdToHtml(item.text || ""),
      noteHtml: item.note ? `<div class="tl-note">${mdToHtml(item.note)}</div>` : ""
    });
  }

  if (item.type === "event") {
    return renderMessageThreadEvent({
      idx,
      badgeHtml: `<div class="thread-badge"><span class="thread-badge__label mono">${escapeHtml(item.label || "INFO")}</span></div>`,
      headHtml: escapeHtml(item.head || ""),
      bodyHtml: mdToHtml(item.body || "")
    });
  }

  return renderMessageThreadComment({
    idx,
    author: item.author || "Utilisateur",
    tsHtml: `<div class="gh-comment-ts mono">${escapeHtml(fmtTs(item.at))}</div>`,
    bodyHtml: mdToHtml(item.body || ""),
    avatarHtml: item.authorType === "human"
      ? svgIcon("avatar-human", { width: 22, height: 22, className: "ui-icon ui-icon--block", style: "display:block" })
      : "",
    avatarType: item.authorType === "human" ? "human" : "agent",
    avatarInitial: item.authorType === "human" ? "M" : "R"
  });
}

function renderComposer() {
  const actionsHtml = [
    `<button class="gh-btn gh-btn--help-mode ${state.helpMode ? "is-on" : ""}" data-discussion-action="toggle-help" type="button">Help</button>`,
    `<button class="gh-btn" data-discussion-action="submit-comment" type="button">Commenter</button>`
  ].join("");

  const hintHtml = `
    <div class="rapso-mention-hint comment-composer__hint">
      <span class="mono">Astuces :</span>
      <span>texte libre, lien vers un sujet, pièce jointe ou commande <code>/help</code>.</span>
    </div>
  `;

  return renderCommentComposer({
    title: "Ajouter un commentaire",
    avatarHtml: svgIcon("avatar-human", { width: 22, height: 22, className: "ui-icon ui-icon--block", style: "display:block" }),
    previewMode: state.composerPreview,
    helpMode: state.helpMode,
    textareaId: "projectDiscussionComposer",
    previewId: "projectDiscussionComposerPreview",
    textareaValue: state.composerText,
    placeholder: state.helpMode
      ? "Pose une question d'aide contextuelle sur cette discussion…"
      : "Ajouter un commentaire, un lien, une image ou une activité…",
    hintHtml,
    actionsHtml
  });
}

function renderDetailView() {
  const discussion = getSelectedDiscussion();
  if (!discussion) return renderListView();

  const category = getCategoryMeta(discussion.categoryId);

  return `
    <section class="project-discussions__detail">
      <div class="project-discussions__detail-topbar" data-chrome-visibility="expanded">
        <button type="button" class="gh-btn" data-discussion-action="back-to-list">← Retour</button>
        <button type="button" class="gh-btn gh-btn--primary" data-discussion-action="new-discussion">Nouvelle discussion</button>
      </div>

      <div class="project-discussions__detail-head">
        <div class="project-discussions__detail-title-row">
          <div class="project-discussions__category-pill mono">${escapeHtml(category.icon)} ${escapeHtml(category.label)}</div>
          <div class="project-discussions__state-pill mono">${discussion.isOpen ? "Open" : "Closed"}</div>
        </div>

        <h2 class="project-discussions__detail-title">${escapeHtml(discussion.title)}</h2>

        <div class="project-discussions__detail-meta">
          ${escapeHtml(discussion.author)} ${escapeHtml(discussion.kind)} · ${escapeHtml(fmtTs(discussion.updatedAt))}
        </div>
      </div>

      ${renderMessageThread({
        className: "project-discussions__thread",
        itemsHtml: discussion.timeline.map((item, idx) => renderTimelineItem(item, idx)).join("")
      })}

      <div class="project-discussions__composer-wrap">
        ${renderComposer()}
      </div>
    </section>
  `;
}

function renderPage() {
  return renderSideNavLayout({
    className: "project-discussions side-nav-layout--discussions",
    navClassName: "project-discussions__nav",
    contentClassName: "project-discussions__content",
    navHtml: renderLeftNav(),
    contentHtml: `
      <section class="project-discussions__scroll" id="projectDiscussionsScroll">
        ${state.selectedDiscussionId ? renderDetailView() : renderListView()}
      </section>
    `
  });
}

function syncHeader() {
  const selected = getSelectedDiscussion();

  if (selected) {
    const category = getCategoryMeta(selected.categoryId);

    setProjectViewHeader({
      contextLabel: "Discussions",
      variant: "discussions",
      title: selected.title,
      subtitle: `${category.label} · ${selected.author}`,
      toolbarHtml: `
        <div class="project-discussions__header-toolbar">
          <button type="button" class="gh-btn" data-discussion-action="back-to-list">Retour aux discussions</button>
          <button type="button" class="gh-btn gh-btn--primary" data-discussion-action="new-discussion">Nouvelle discussion</button>
        </div>
      `
    });
    return;
  }

  setProjectViewHeader({
    contextLabel: "Discussions",
    variant: "discussions",
    title: "",
    subtitle: "",
    toolbarHtml: ""
  });
}

function pushFakeHelpReply(text) {
  const discussion = getSelectedDiscussion();
  if (!discussion) return;

  discussion.timeline.push({
    type: "comment",
    author: "@rapso",
    authorType: "agent",
    at: new Date().toISOString(),
    body: `Mode help actif.\n\nQuestion reçue : **${text || "(vide)"}**\n\nDans cette phase, la réponse est simulée mais la zone de saisie, la preview et la timeline sont déjà mutualisées.`
  });
}

function pushFakeComment(text) {
  const discussion = getSelectedDiscussion();
  if (!discussion) return;

  discussion.timeline.push({
    type: "comment",
    author: "Mano",
    authorType: "human",
    at: new Date().toISOString(),
    body: text
  });

  discussion.updatedAt = new Date().toISOString();
  discussion.repliesCount += 1;
}

function bindEvents(root) {
  bindGhActionButtons();

  bindGhSelectMenus(root, {
    onChange(selectId, value) {
      if (selectId === "projectDiscussionsSort") {
        state.sort = value;
        renderProjectDiscussions(root);
      }

      if (selectId === "projectDiscussionsFilter") {
        state.filter = value;
        renderProjectDiscussions(root);
      }
    }
  });

  root.querySelectorAll("[data-side-nav-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedCategoryId = btn.dataset.sideNavTarget || "all";
      state.selectedDiscussionId = "";
      renderProjectDiscussions(root);
    });
  });

  root.querySelectorAll("[data-discussion-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedDiscussionId = row.dataset.discussionId || "";
      renderProjectDiscussions(root);
    });

    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.selectedDiscussionId = row.dataset.discussionId || "";
        renderProjectDiscussions(root);
      }
    });
  });

  root.querySelectorAll(".gh-action").forEach((el) => {
    el.addEventListener("ghaction:action", (event) => {
      const action = String(event.detail?.action || "");
      if (action === "new-discussion") {
        alert("Phase 1 UI : la création réelle sera branchée plus tard.");
      }
    });
  });

  root.querySelectorAll("[data-discussion-action='back-to-list']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedDiscussionId = "";
      renderProjectDiscussions(root);
    });
  });

  root.querySelectorAll("[data-discussion-action='new-discussion']").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert("Phase 1 UI : la création réelle sera branchée plus tard.");
    });
  });

  const searchInput = root.querySelector("#projectDiscussionsSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.search = event.target.value || "";
      renderProjectDiscussions(root);
    });
  }

  root.querySelectorAll("[data-action='tab-write']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.composerPreview = false;
      renderProjectDiscussions(root);
    });
  });

  root.querySelectorAll("[data-action='tab-preview']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.composerPreview = true;
      renderProjectDiscussions(root);
    });
  });

  root.querySelectorAll("[data-discussion-action='toggle-help']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.helpMode = !state.helpMode;
      renderProjectDiscussions(root);
    });
  });

  const textarea = root.querySelector("#projectDiscussionComposer");
  if (textarea) {
    textarea.addEventListener("input", (event) => {
      state.composerText = event.target.value || "";
      const preview = root.querySelector("#projectDiscussionComposerPreview");
      if (preview) preview.innerHTML = mdToHtml(state.composerText);
    });

    const preview = root.querySelector("#projectDiscussionComposerPreview");
    if (preview) preview.innerHTML = mdToHtml(state.composerText);
  }

  root.querySelectorAll("[data-discussion-action='submit-comment']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = String(state.composerText || "").trim();
      if (!text) return;

      if (state.helpMode || /^\s*(\/help|@help)\b/i.test(text)) {
        pushFakeHelpReply(text.replace(/^\s*(\/help|@help)\b\s*/i, ""));
      } else {
        pushFakeComment(text);
      }

      state.composerText = "";
      state.composerPreview = false;
      renderProjectDiscussions(root);
    });
  });
}

export function renderProjectDiscussions(root) {
  root.className = "project-shell__content";

  syncHeader();
  root.innerHTML = renderPage();

  registerProjectPrimaryScrollSource(document.getElementById("projectDiscussionsScroll"));
  bindEvents(root);

  const preview = root.querySelector("#projectDiscussionComposerPreview");
  if (preview) preview.innerHTML = mdToHtml(state.composerText);
}
