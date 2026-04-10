export function createProjectSubjectsReviewState({
  store,
  firstNonEmpty,
  nowIso,
  normalizeReviewState,
  renderReviewStateIcon,
  getRunBucket,
  persistRunBucket,
  getNestedSituation,
  getNestedSujet,
  getNestedAvis
}) {
  const DEFAULT_REVIEW_META = Object.freeze({
    is_seen: false,
    review_state: "pending",
    is_published: false,
    last_published_at: null,
    has_changes_since_publish: false
  });

  function getEntityByType(entityType, entityId) {
    if (entityType === "avis") return getNestedAvis(entityId);
    if (entityType === "sujet") return getNestedSujet(entityId);
    if (entityType === "situation") return getNestedSituation(entityId);
    return null;
  }

  function normalizeReviewMeta(meta = {}) {
    return {
      is_seen: !!meta.is_seen,
      review_state: normalizeReviewState(meta.review_state || "pending"),
      is_published: !!meta.is_published,
      last_published_at: meta.last_published_at ? String(meta.last_published_at) : null,
      has_changes_since_publish: !!meta.has_changes_since_publish,
      first_seen_at: meta.first_seen_at ? String(meta.first_seen_at) : null,
      validated_at: meta.validated_at ? String(meta.validated_at) : null,
      rejected_at: meta.rejected_at ? String(meta.rejected_at) : null,
      dismissed_at: meta.dismissed_at ? String(meta.dismissed_at) : null,
      source_verdict: meta.source_verdict ? String(meta.source_verdict) : null,
      effective_verdict: meta.effective_verdict ? String(meta.effective_verdict) : null,
      has_human_edit: !!meta.has_human_edit
    };
  }

  function getBaseReviewMeta(entity) {
    if (!entity) return { ...DEFAULT_REVIEW_META };

    return normalizeReviewMeta({
      is_seen: entity.is_seen,
      review_state: entity.review_state,
      is_published: entity.is_published,
      last_published_at: entity.last_published_at,
      has_changes_since_publish: entity.has_changes_since_publish
    });
  }

  function getReviewEntry(entityType, entityId) {
    const { bucket } = getRunBucket();
    return bucket?.review?.[entityType]?.[entityId] || null;
  }

  function getEntityReviewMeta(entityType, entityId) {
    const entity = getEntityByType(entityType, entityId);
    const base = getBaseReviewMeta(entity);
    const stored = getReviewEntry(entityType, entityId);

    if (!stored) return base;
    return normalizeReviewMeta({ ...base, ...stored });
  }

  function syncEntityReviewMeta(entityType, entityId) {
    const entity = getEntityByType(entityType, entityId);
    if (!entity) return;

    const meta = getEntityReviewMeta(entityType, entityId);
    entity.is_seen = meta.is_seen;
    entity.review_state = meta.review_state;
    entity.is_published = meta.is_published;
    entity.last_published_at = meta.last_published_at;
    entity.has_changes_since_publish = meta.has_changes_since_publish;

    if (entity.raw && typeof entity.raw === "object") {
      entity.raw.is_seen = meta.is_seen;
      entity.raw.review_state = meta.review_state;
      entity.raw.is_published = meta.is_published;
      entity.raw.last_published_at = meta.last_published_at;
      entity.raw.has_changes_since_publish = meta.has_changes_since_publish;
    }
  }

  function setEntityReviewMeta(entityType, entityId, patch = {}, options = {}) {
    const ts = options.ts || nowIso();

    persistRunBucket((bucket) => {
      bucket.review = bucket.review || { avis: {}, sujet: {}, situation: {} };
      bucket.review[entityType] = bucket.review[entityType] || {};

      const prev = normalizeReviewMeta({
        ...getEntityReviewMeta(entityType, entityId),
        ...(bucket.review[entityType][entityId] || {})
      });

      bucket.review[entityType][entityId] = {
        ...prev,
        ...(bucket.review[entityType][entityId] || {}),
        ...patch,
        updated_at: ts
      };
    });

    syncEntityReviewMeta(entityType, entityId);
  }

  function getReviewRestoreSnapshot(entityType, entityId) {
    const entry = getReviewEntry(entityType, entityId);
    if (!entry?.restore_snapshot) return null;
    return normalizeReviewMeta(entry.restore_snapshot);
  }

  function stashReviewRestoreSnapshot(entityType, entityId, options = {}) {
    if (getReviewRestoreSnapshot(entityType, entityId)) return;
    const snapshot = getEntityReviewMeta(entityType, entityId);
    setEntityReviewMeta(entityType, entityId, {
      restore_snapshot: { ...snapshot }
    }, options);
  }

  function restoreEntityReviewMeta(entityType, entityId, options = {}) {
    const snapshot = getReviewRestoreSnapshot(entityType, entityId);
    if (!snapshot) return false;

    const ts = options.ts || nowIso();
    persistRunBucket((bucket) => {
      bucket.review = bucket.review || { avis: {}, sujet: {}, situation: {} };
      bucket.review[entityType] = bucket.review[entityType] || {};
      const prev = bucket.review[entityType][entityId] || {};
      bucket.review[entityType][entityId] = {
        ...prev,
        ...snapshot,
        updated_at: ts
      };
      delete bucket.review[entityType][entityId].restore_snapshot;
    });

    syncEntityReviewMeta(entityType, entityId);
    return true;
  }

  function markEntitySeen(entityType, entityId, options = {}) {
    if (!entityType || !entityId) return;

    const meta = getEntityReviewMeta(entityType, entityId);
    if (meta.is_seen && meta.first_seen_at) return;

    const entity = getEntityByType(entityType, entityId);
    const sourceVerdict = entityType === "avis"
      ? firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
      : null;

    setEntityReviewMeta(entityType, entityId, {
      is_seen: true,
      first_seen_at: meta.first_seen_at || nowIso(),
      source_verdict: sourceVerdict
    }, options);
  }

  function markEntityValidated(entityType, entityId, options = {}) {
    if (!entityType || !entityId) return;

    const meta = getEntityReviewMeta(entityType, entityId);
    const entity = getEntityByType(entityType, entityId);
    const sourceVerdict = entityType === "avis"
      ? firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
      : null;
    const effectiveVerdict = entityType === "avis"
      ? firstNonEmpty(store.situationsView.tempAvisVerdict, entity?.verdict, meta.effective_verdict, sourceVerdict, null)
      : null;

    setEntityReviewMeta(entityType, entityId, {
      is_seen: true,
      review_state: "validated",
      first_seen_at: meta.first_seen_at || nowIso(),
      validated_at: nowIso(),
      source_verdict: sourceVerdict,
      effective_verdict: effectiveVerdict,
      has_changes_since_publish: meta.is_published ? true : meta.has_changes_since_publish
    }, options);
  }

  function canRejectEntity(entityType, entityId) {
    const meta = getEntityReviewMeta(entityType, entityId);
    if (meta.is_published && !meta.has_changes_since_publish) {
      window.alert("Cet élément a déjà été diffusé et ne peut plus être supprimé / rejeté dans son état diffusé.");
      return false;
    }
    return true;
  }

  function setEntityReviewState(entityType, entityId, nextState, options = {}) {
    const reviewState = normalizeReviewState(nextState);
    if ((reviewState === "rejected" || reviewState === "dismissed") && !canRejectEntity(entityType, entityId)) {
      return false;
    }

    const meta = getEntityReviewMeta(entityType, entityId);

    const entity = getEntityByType(entityType, entityId);
    const sourceVerdict = entityType === "avis"
      ? firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
      : null;

    setEntityReviewMeta(entityType, entityId, {
      is_seen: true,
      review_state: reviewState,
      first_seen_at: meta.first_seen_at || nowIso(),
      rejected_at: reviewState === "rejected" ? nowIso() : meta.rejected_at,
      dismissed_at: reviewState === "dismissed" ? nowIso() : meta.dismissed_at,
      source_verdict: sourceVerdict,
      has_changes_since_publish:
        meta.is_published && reviewState !== "published"
          ? true
          : meta.has_changes_since_publish
    }, options);

    return true;
  }

  function getReviewTitleStateClass(entityType, entityId) {
    const meta = getEntityReviewMeta(entityType, entityId);
    return meta.is_seen ? "is-seen" : "is-unseen";
  }

  function renderEntityReviewLeadIcon(entityType, entityId) {
    const meta = getEntityReviewMeta(entityType, entityId);
    const normalizedType = String(entityType || "").toLowerCase();
    const normalizedState = normalizeReviewState(meta.review_state);

    if ((normalizedType === "sujet" || normalizedType === "situation")
      && (normalizedState === "rejected" || normalizedState === "dismissed")) {
      return "";
    }

    return renderReviewStateIcon(meta.review_state, {
      entityType,
      isPublished: meta.is_published,
      hasChangesSincePublish: meta.has_changes_since_publish,
      isSeen: meta.is_seen
    });
  }

  return {
    DEFAULT_REVIEW_META,
    getEntityByType,
    normalizeReviewMeta,
    getBaseReviewMeta,
    getReviewEntry,
    getEntityReviewMeta,
    syncEntityReviewMeta,
    setEntityReviewMeta,
    getReviewRestoreSnapshot,
    stashReviewRestoreSnapshot,
    restoreEntityReviewMeta,
    markEntitySeen,
    markEntityValidated,
    canRejectEntity,
    setEntityReviewState,
    getReviewTitleStateClass,
    renderEntityReviewLeadIcon
  };
}
