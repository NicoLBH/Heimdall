const EDGE_UPLOAD_MODE = Object.freeze({
  EDGE_ONLY: "edge_only",
  EDGE_WITH_DIRECT_FALLBACK: "edge_with_direct_fallback"
});

function readBooleanConfigFlag(flagName, defaultValue = false) {
  try {
    if (!window?.MDALL_CONFIG || !Object.prototype.hasOwnProperty.call(window.MDALL_CONFIG, flagName)) {
      return defaultValue;
    }
    return Boolean(window.MDALL_CONFIG[flagName]);
  } catch {
    return defaultValue;
  }
}

export function resolveSubjectAttachmentUploadTransportMode() {
  const edgeUploadEnabled = readBooleanConfigFlag("enableEdgeAttachmentUpload", true);
  if (!edgeUploadEnabled) return EDGE_UPLOAD_MODE.EDGE_WITH_DIRECT_FALLBACK;

  const allowDirectFallback = readBooleanConfigFlag("allowDirectAttachmentUploadFallback", false);
  if (allowDirectFallback) return EDGE_UPLOAD_MODE.EDGE_WITH_DIRECT_FALLBACK;

  return EDGE_UPLOAD_MODE.EDGE_ONLY;
}

export function shouldFallbackToDirectUploadFromEdgeHttpFailure(status = 0, responseBody = "") {
  const bodyText = String(responseBody || "");
  return (
    status === 404
    || status === 405
    || status >= 500
    || /cors|preflight|failed to fetch/i.test(bodyText)
  );
}

export function shouldFallbackToDirectUploadFromEdgeNetworkFailure(error) {
  const message = String(error?.message || error || "");
  return /failed to fetch|networkerror|cors|preflight/i.test(message);
}

export function logSubjectAttachmentUploadTransport(mode, details = {}) {
  console.info("[subject-attachments] upload transport", { mode, ...details });
}

export { EDGE_UPLOAD_MODE };
