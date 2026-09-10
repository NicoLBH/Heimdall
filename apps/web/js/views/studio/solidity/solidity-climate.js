/**
 * Neige, vent et gel : deux appels, et la localisation qui les nourrit.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * L'écran calculait bien — les tables sont au serveur — mais il versait cinq
 * valeurs solitaires : aucune ne disait par quel appel elle avait été obtenue,
 * ni à partir de quelle commune, ni comment la refaire. Le raisonnement
 * climatique s'arrêtait donc à sa première ligne, et une variante d'altitude
 * rangeait tout ce qui en découlait « à revérifier ».
 *
 * Il verse maintenant ce qu'il faut pour **refaire** : la localisation et
 * l'altitude comme entrées, les deux appels d'agent-D comme raisonnement, les
 * zones et la cote comme ce que le projet retient. Voir
 * `services/climat-versement.js` et `utilitaires/agents-climatiques.js`.
 *
 * ## La localisation se saisit
 *
 * Elle venait en silence du formulaire du projet. Un projet dont l'adresse
 * n'avait pas de code INSEE recevait une erreur du serveur sans savoir laquelle,
 * et personne ne pouvait voir avec quelle commune un zonage avait été calculé.
 * Elle est donc à l'écran, modifiable, et le calcul refuse de partir sans le
 * code INSEE — en le disant.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { store } from "../../../store.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { getEffectiveProjectLocation } from "./solidity-climate-tool-common.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { renderTransformer, TRANSFORMER, brancheDeLAction } from "../../ui/transformer.js";
import { branchesOuvertes, oublierLesBranches } from "../../../services/branches-ouvertes.js";
import { lignesVersables, mesure } from "../../../services/climat-versement.js";
import { fetchGoogleMapsPlaceEmbedUrl } from "../../../services/google-maps-embed-service.js";
import { renderProjectLocationMapCard } from "../../shared/project-location-map-card.js";

const TOOL_KEYS = ["snow", "wind", "frost"];
const TOOL_LABELS = {
  snow: "Neige",
  wind: "Vent",
  frost: "Gel"
};

const state = {
  // Vrai le temps qu'une proposition se prépare : le bouton le dit, et ne se
  // reclique pas.
  transforming: false, loading: false, error: "", projectId: "",
  /**
   * La localisation **saisie**, celle avec laquelle on calcule.
   *
   * Elle part de celle du projet et s'en détache dès qu'on y touche : c'est une
   * saisie d'Atelier, elle n'écrit rien nulle part. Ce qu'elle deviendra pour le
   * projet passe par une proposition, comme le reste.
   */
  location: null,
  results: {}, mapUrl: "", mapLoading: false };

/** Les champs de la localisation, dans l'ordre où on les lit. */
const CHAMPS_DE_LOCALISATION = [
  { cle: "city", nom: "Commune", exemple: "Briançon" },
  { cle: "codeInsee", nom: "Code INSEE", exemple: "05023" },
  { cle: "postalCode", nom: "Code postal", exemple: "05100" },
  { cle: "altitude", nom: "Altitude", exemple: "1326", unite: "m" }
];

/** Vrai quand le serveur a de quoi répondre. Sans code INSEE, il ne peut pas. */
function saisieSuffisante() {
  return String(state.location?.codeInsee || "").trim().length > 0;
}

function buildClimateDraftDescription() {
  const projectName = String(store.projectForm?.projectName || store.currentProject?.name || "").trim() || "Nom_du projet";
  const address = [state.location?.address, state.location?.postalCode, state.location?.city].filter(Boolean).join(", ") || "adresse_complète_du_projet_dans_localisation";

  const snowResult = state.results?.snow?.result_payload || {};
  const windResult = state.results?.wind?.result_payload || {};
  const frostResult = state.results?.frost?.result_payload || {};

  const snowZone = String(snowResult?.snow_zone || "—");
  const altitude = Number(snowResult?.altitude ?? state.location?.altitude);
  const altitudeText = Number.isFinite(altitude) ? `${altitude.toFixed(2)} m` : "—";
  const windZone = String(windResult?.wind_zone || "—");
  const frostDepth = Number(frostResult?.frost_depth_m);
  const frostDepthText = Number.isFinite(frostDepth) ? `${frostDepth.toFixed(3)} m` : "—";
  const h0Selected = Number(frostResult?.h0_selected_m);
  const h0SelectedText = Number.isFinite(h0Selected) ? `${h0Selected.toFixed(1)} m` : "—";

  return `Le projet \`${projectName}\` est situé ${address}. Les charges climatiques qui lui sont applicables sont les suivantes :

- Zone neige: **${snowZone}**
- Altitude: **${altitudeText}**
- Zone vent: **${windZone}**


En application du NF DTU 13.1, les fondations devront respecter la cote hors gel mini par rapport au niveau extérieur fini H (en mètres) tel que:
H >  **${frostDepthText}**

avec H0 retenu: **${h0SelectedText}**`;
}

/**
 * Ce que ces résultats proposent au projet.
 *
 * Huit lignes, et elles ne se valent pas : deux entrées — la localisation et
 * l'altitude —, deux appels d'agent-D, quatre valeurs posées. C'est cette forme
 * qui rend la chaîne rejouable, et le fichier qui la construit vit à part parce
 * qu'il ne parle à personne : `services/climat-versement.js`.
 *
 * Ce qui n'a pas de valeur n'entre pas : une zone qu'on n'a pas su lire ne
 * s'affirme pas « — ».
 */
function affirmationsClimatiques(zone = "") {
  return lignesVersables({
    localisation: state.location ?? {},
    resultats: state.results ?? {},
    zone
  });
}

function buildClimateDraftTitle() {
  const city = String(state.location?.city || "").trim();
  return `Charges climatiques applicables au projet (neige, vent et gel) - ${city || "Ville inconnue"}`;
}

export async function renderSolidityClimate(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.solidityClimateMounted === "true") return;
  root.dataset.solidityClimateMounted = "true";

  await hydrateState();
  render(root);

  root.onclick = async (event) => {
    const calculateTrigger = event.target.closest('[data-action-id="solidityToolCalculate-climate"]');
    if (calculateTrigger) {
      await calculateAll();
      render(root);
      return;
    }

  };

  // « Transformer » : ouvrir un sujet pour en débattre, ou préparer une
  // proposition à signer. Aucune des deux n'écrit dans la mémoire du projet —
  // voir `docs/fondamentaux.md`.
  //
  // Une seule fois par nœud. `renderSolidityClimate` se rappelle avec `force`
  // à chaque venue sur le panneau, et `addEventListener` s'ajoute là où
  // `root.onclick` se remplace : deux venues faisaient partir **deux**
  // propositions pour un clic, et deux fenêtres de zones se recouvraient — d'où
  // l'impression qu'elle ne se fermait pas.
  if (root.dataset.climateBranche !== "true") {
    root.dataset.climateBranche = "true";
    root.addEventListener("ghaction:action", (event) => {
      const quoi = event.detail?.action;
      if (quoi === TRANSFORMER.SUJET) {
        const opener = typeof window !== "undefined" ? window.openStudioToolSubjectDraft : null;
        if (typeof opener !== "function") {
          console.warn("[studio-tool-subject] open-draft unavailable", { toolKey: "climate" });
          return;
        }
        opener({
          origin: "studio-climate",
          title: buildClimateDraftTitle(),
          description: buildClimateDraftDescription(),
          meta: { labels: ["climatique"] }
        });
        return;
      }
      // « Faire une proposition » en ouvre une ; « Ajouter à #58 » porte le
      // même lot dans celle-là. Un seul chemin, une destination de plus.
      const branche = brancheDeLAction(quoi);
      if (quoi === TRANSFORMER.PROPOSITION || branche) void proposerLesZones(root, branche);
    });
  }

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

/**
 * Préparer une proposition à partir des zonages.
 *
 * Elle reste **ouverte** : le système la remplit, quelqu'un la relit, arbitre ce
 * qui contredit ce que le projet a déjà décidé, et signe. C'est cette signature
 * qui fait entrer les zones dans la mémoire, jamais ce bouton.
 */
async function proposerLesZones(root, propositionId = "") {
  if (state.transforming) return;

  const affirmations = affirmationsClimatiques();
  if (!affirmations.length) {
    state.error = "Rien à proposer : aucun zonage n'a été calculé.";
    render(root);
    return;
  }

  // Où cela s'applique se demande **avant** d'ouvrir la proposition.
  const { demanderLesZones } = await import("../../ui/choix-des-zones.js");
  const zones = await demanderLesZones({ projectId: state.projectId });
  if (zones === null) return;

  state.transforming = true;
  state.error = "";
  render(root);

  const { preparerUneProposition } = await import("../../../services/atelier-proposition.js");
  const rendu = await preparerUneProposition({
    projectId: state.projectId,
    propositionId,
    titre: buildClimateDraftTitle(),
    intro: "La localisation du projet, les deux appels qui en découlent, et ce qu'ils posent. "
      + "Les entrées entrent avec le reste : c'est ce qui permettra de tout refaire le jour où "
      + "l'une d'elles change.",
    // La première ligne qui cite un texte : les deux premières sont des
    // entrées, et une entrée n'a pas de source réglementaire.
    source: affirmations.find((ligne) => ligne.source)?.source || "",
    affirmations,
    zones
  });

  state.transforming = false;
  if (!rendu.ok) {
    state.error = rendu.raison;
    render(root);
    return;
  }

  // La liste des propositions ouvertes vient de changer : celle qu'on vient
  // d'ouvrir n'y était pas, et celle qu'on vient d'enrichir n'a plus le même
  // contenu. La garder ferait rouvrir une troisième proposition au clic suivant.
  oublierLesBranches();

  render(root);
  // On va où la signature se donne, **et sur la proposition elle-même** : la
  // liste obligerait à retrouver à la main celle qu'on vient de préparer.
  store.pendingPropositionId = rendu.proposition.id;
  // Ce qui n'a pas pu être porté se dit là où ces lignes se trouvent, pas ici :
  // on quitte cet écran à la ligne suivante.
  store.pendingPropositionTranches = rendu.tranches?.length
    ? { propositionId: rendu.proposition.id, tranches: rendu.tranches }
    : null;
  const projet = String(store.currentProjectId || "").trim();
  if (projet) window.location.hash = `#project/${projet}/propositions`;
}

async function hydrateState() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    // Celle du projet au premier montage seulement : une saisie en cours ne se
    // perd pas parce qu'on est passé sur un autre panneau et revenu.
    if (!state.location) state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    const rows = await Promise.all(TOOL_KEYS.map((toolKey) => getLastStudioToolResult({ projectId: state.projectId, toolKey })));
    state.results = Object.fromEntries(rows.map((row, index) => [TOOL_KEYS[index], row]));
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

async function calculateAll() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = state.projectId || await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    if (!state.projectId) throw new Error("Projet introuvable.");
    // La localisation **saisie**, pas celle du formulaire : c'est elle qu'on
    // vient de corriger, et recharger l'autre annulerait la correction sans
    // qu'un mot le dise.
    if (!saisieSuffisante()) throw new Error("Il manque le code INSEE de la commune : les tables de zonage se lisent par lui.");

    const responses = await Promise.all(TOOL_KEYS.map((toolKey) => resolveStudioClimateTool({
      projectId: state.projectId,
      toolKey,
      location: state.location
    })));

    state.results = Object.fromEntries(responses.map((response, index) => [
      TOOL_KEYS[index],
      { result_payload: response?.result || null, markdown_summary: response?.markdown_summary || "" }
    ]));
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

function render(root) {
  const hasResult = TOOL_KEYS.some((toolKey) => Boolean(state.results?.[toolKey]?.result_payload));
  const actionLabel = state.loading ? "Calcul en cours..." : hasResult ? "Recalculer" : "Calculer";
  // Sans code INSEE, le serveur répond 400 et l'écran affichait son message
  // brut. On refuse avant, et l'on dit pourquoi à côté du champ.
  const peutCalculer = saisieSuffisante();

  root.innerHTML = `
    <section class="settings-section is-active" data-solidity-tool-card="climate">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Zones et charges climatiques</h4>
              <div class="studio-tool-card__actions">
                ${renderTransformer({
                  id: "solidityToolTransform-climate",
                  disabled: !hasResult || state.transforming,
                  ouvertes: branchesOuvertes(() => render(root))
                })}
                ${renderGhActionButton({ id: "solidityToolCalculate-climate", label: actionLabel, tone: "primary", size: "md", disabled: !!state.loading || !peutCalculer, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          ${state.error ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>` : ""}
          <div data-solidity-climate-map class="studio-tool-map-layer">
            ${renderMapCard()}
          </div>
          <div class="studio-tool-overlay-grid" style="display:grid;grid-template-columns:300px minmax(0px, 1fr);gap:16px;align-items:start;">
            ${renderCards()}
          </div>
        </div>
      </div>
    </section>
  `;
  brancherLaSaisie(root);
  void refreshMapCard(root);
}

function renderCards() {
  return `<div class="studio-tool-cards-column">${renderAddressCard()}${TOOL_KEYS.map((toolKey) => renderToolCard(toolKey)).join("")}</div><div></div>`;
}

/**
 * La localisation, saisissable.
 *
 * Pré-remplie par celle du projet, et modifiable : c'est une saisie d'Atelier,
 * elle n'écrit rien. Ce qu'elle deviendra pour le projet passe par la
 * proposition, comme le reste.
 *
 * Le code INSEE porte sa propre phrase parce qu'il est le seul qui **bloque** :
 * le serveur lit ses tables par lui, et deux communes homonymes ne se
 * distinguent pas autrement. Un bouton grisé sans raison se reclique dix fois.
 */
function renderAddressCard() {
  const location = state.location || {};

  return `
    <article class="studio-tool-info-card climat-localisation">
      <h4>Localisation</h4>
      <p class="gh-text-muted climat-localisation__quoi">
        Ce avec quoi le calcul part. Elle vient du projet ; la corriger ici ne change
        que ce calcul-ci.
      </p>
      ${CHAMPS_DE_LOCALISATION.map((champ) => `
        <label class="climat-localisation__champ">
          <span>${escapeHtml(champ.nom)}${champ.unite ? ` <i>(${escapeHtml(champ.unite)})</i>` : ""}</span>
          <input type="text" class="gh-input" data-climat-champ="${escapeHtml(champ.cle)}"
            value="${escapeHtml(String(location[champ.cle] ?? ""))}"
            placeholder="${escapeHtml(champ.exemple)}" autocomplete="off">
        </label>
      `).join("")}
      ${
        saisieSuffisante()
          ? ""
          : `<p class="climat-localisation__manque">
              Le code INSEE désigne la commune sans ambiguïté — deux communes peuvent porter le même
              nom. Les tables de zonage se lisent par lui : sans code INSEE, rien ne se calcule.
            </p>`
      }
      <button type="button" class="gh-btn gh-btn--sm" data-climat-reprendre>
        Reprendre celle du projet
      </button>
    </article>
  `;
}

/**
 * Les gestes de la saisie.
 *
 * L'écran ne se redessine **pas** à la frappe : il perdrait le curseur à chaque
 * lettre. Seul l'état change, et le bouton « Calculer » suit — c'est le seul
 * élément dont l'apparence dépende de ce qu'on tape.
 */
function brancherLaSaisie(root) {
  for (const champ of root.querySelectorAll("[data-climat-champ]")) {
    champ.addEventListener("input", () => {
      const cle = champ.getAttribute("data-climat-champ") || "";
      const dit = champ.value.trim();
      state.location = {
        ...(state.location ?? {}),
        [cle]: cle === "altitude" ? (dit === "" ? null : Number(dit.replace(",", "."))) : dit
      };
      const bouton = root.querySelector('[data-action-id="solidityToolCalculate-climate"] button');
      if (bouton) bouton.disabled = state.loading || !saisieSuffisante();
      const manque = root.querySelector(".climat-localisation__manque");
      if (manque) manque.hidden = saisieSuffisante();
    });
  }

  root.querySelector("[data-climat-reprendre]")?.addEventListener("click", () => {
    state.location = getEffectiveProjectLocation();
    render(root);
  });
}

/**
 * La carte d'un outil.
 *
 * Les nombres s'y écrivent **comme la mémoire les écrira** : virgule décimale,
 * unité collée. La carte affichait « 0.894 » là où la ligne versée dira
 * « 0,89 m », et l'on aurait cherché longtemps d'où venait la différence.
 */
function renderToolCard(toolKey) {
  const result = state.results?.[toolKey]?.result_payload || null;
  const title = TOOL_LABELS[toolKey] || toolKey;
  const altitudeLabel = mesure(result?.altitude ?? state.location?.altitude, 2, "m") || "—";
  const details = toolKey === "snow"
    ? `<li>Région: <strong>${escapeHtml(result?.snow_zone || "—")}</strong></li><li>Altitude: <strong>${escapeHtml(altitudeLabel)}</strong></li>`
    : toolKey === "wind"
      ? `<li>Région: <strong>${escapeHtml(result?.wind_zone || "—")}</strong></li>`
      : `<li>Profondeur hors gel: <strong>${escapeHtml(mesure(result?.frost_depth_m, 2, "m") || "—")}</strong></li>`
        + `<li>H0: <strong>${escapeHtml(mesure(result?.h0_selected_m, 1, "m") || "—")}</strong></li>`;

  return `
    <article class="studio-tool-info-card">
      <h4 class="studio-tool-info-card-title">${escapeHtml(title)}</h4>
      <ul>${details}</ul>
    </article>
  `;
}

function renderMapCard() {
  return renderProjectLocationMapCard({
    latitude: state.location?.latitude,
    longitude: state.location?.longitude,
    embedUrl: state.mapUrl,
    isLoading: state.mapLoading,
    showSpinner: true,
    iframeTitle: "Carte Google Maps de la localisation du projet",
    height: "calc(100vh - 210px)",
    containerClassName: "studio-tool-map-card"
  });
}

async function refreshMapCard(root) {
  if (!root || !Number.isFinite(Number(state.location?.latitude)) || !Number.isFinite(Number(state.location?.longitude))) return;
  state.mapLoading = true;
  const host = root.querySelector("[data-solidity-climate-map]");
  if (host) host.innerHTML = renderMapCard();
  try {
    state.mapUrl = await fetchGoogleMapsPlaceEmbedUrl({ latitude: Number(state.location.latitude), longitude: Number(state.location.longitude), zoom: 16, mapType: "satellite" });
  } catch {
    state.mapUrl = "";
  } finally {
    state.mapLoading = false;
    if (host) host.innerHTML = renderMapCard();
  }
}
