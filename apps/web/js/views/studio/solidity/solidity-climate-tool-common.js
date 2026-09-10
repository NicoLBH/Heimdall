import { store } from "../../../store.js";
import { readPersistedCurrentProjectState } from "../../../services/project-state-storage.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { nombreOuRien } from "../../../services/adresse-saisie.js";

/**
 * La localisation du projet, telle que les ateliers la reprennent.
 *
 * Les trois nombres passent par `nombreOuRien` : `Number(null)` vaut zéro, et
 * un projet sans coordonnées demandait donc une carte satellite du point
 * 0°N 0°E — au large du golfe de Guinée — au lieu de montrer qu'il n'avait pas
 * de localisation. Une altitude absente valait zéro mètre, et zéro mètre se
 * calcule très bien jusqu'à une cote hors gel fausse.
 */
export function getEffectiveProjectLocation() {
  const persisted = readPersistedCurrentProjectState();
  const persistedForm = persisted?.projectForm && typeof persisted.projectForm === "object" ? persisted.projectForm : {};
  const liveForm = store.projectForm && typeof store.projectForm === "object" ? store.projectForm : {};
  return {
    // L'adresse vient avec : l'écran climatique la relit dans son champ, et sans
    // elle il affichait un champ vide au-dessus d'une carte qui montrait bien le
    // projet — on croyait n'avoir rien saisi.
    address: String(liveForm.address || persistedForm.address || "").trim(),
    city: String(liveForm.city || persistedForm.city || "").trim(),
    postalCode: String(liveForm.postalCode || persistedForm.postalCode || "").trim(),
    latitude: nombreOuRien(liveForm.latitude) ?? nombreOuRien(persistedForm.latitude),
    longitude: nombreOuRien(liveForm.longitude) ?? nombreOuRien(persistedForm.longitude),
    altitude: nombreOuRien(liveForm.altitude) ?? nombreOuRien(persistedForm.altitude),
    codeInsee: String(liveForm.codeInsee || persistedForm.codeInsee || "").trim()
  };
}

export async function hydrateClimateToolState(state, toolKey) {
  state.loading = true;
  state.error = "";
  try {
    const projectId = await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    state.lastResult = await getLastStudioToolResult({ projectId: state.projectId, toolKey });
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

export async function calculateClimateTool(state, toolKey) {
  state.loading = true;
  state.error = "";
  try {
    const projectId = state.projectId || await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    const response = await resolveStudioClimateTool({
      projectId: state.projectId,
      toolKey,
      location: state.location
    });
    state.lastResult = {
      result_payload: response?.result || null,
      markdown_summary: response?.markdown_summary || ""
    };
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}
