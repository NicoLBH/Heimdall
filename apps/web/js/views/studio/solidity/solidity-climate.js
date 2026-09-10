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
 * ## La localisation se saisit — en un champ
 *
 * Elle venait en silence du formulaire du projet. Un projet dont l'adresse
 * n'avait pas de code INSEE recevait une erreur du serveur sans savoir laquelle,
 * et personne ne pouvait voir avec quelle commune un zonage avait été calculé.
 * Elle est donc à l'écran.
 *
 * Elle y a d'abord été **quatre champs** — commune, code INSEE, code postal,
 * altitude — et c'était une mauvaise réponse à un vrai problème : personne ne
 * connaît le code INSEE de sa commune, et le taper de mémoire, c'est calculer
 * la neige d'une homonyme. On tape maintenant **une adresse**, comme dans les
 * Paramètres et avec le même champ (`views/ui/saisie-adresse.js`) ; le service
 * rend la commune, son code INSEE, son code postal et ses coordonnées, dont
 * l'altitude se déduit.
 *
 * ## Et le calcul part tout seul
 *
 * Il y avait un bouton « Calculer », et il ne servait qu'à répéter ce que le
 * choix d'une adresse disait déjà. Le principe de cet écran est d'**explorer** —
 * essayer une adresse, en regarder les zones, en essayer une autre — et un
 * bouton entre les deux ajoute un geste par essai, sans rien décider. Choisir
 * une adresse recalcule ; reprendre celle du projet recalcule ; il n'y a plus
 * rien à cliquer entre les deux.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { store } from "../../../store.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { getEffectiveProjectLocation } from "./solidity-climate-tool-common.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { renderTransformer, TRANSFORMER, brancheDeLAction } from "../../ui/transformer.js";
import { branchesOuvertes, oublierLesBranches } from "../../../services/branches-ouvertes.js";
import { demanderLeTitre } from "../../ui/titre-de-la-proposition.js";
import { lignesVersables, mesure } from "../../../services/climat-versement.js";
import { fetchGoogleMapsPlaceEmbedUrl } from "../../../services/google-maps-embed-service.js";
import { renderProjectLocationMapCard } from "../../shared/project-location-map-card.js";
import { renderSaisieAdresse, brancherLaSaisieDAdresse } from "../../ui/saisie-adresse.js";
import { adresseEnUneLigne, localisationCalculable, nombreOuRien } from "../../../services/adresse-saisie.js";
import { fetchFrenchAltitude } from "../../../services/georisques-service.js";
import { renderSpinnerHtml } from "../../ui/spinner.js";

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
  results: {}, mapUrl: "", mapLoading: false,
  /** Ce que la dernière adresse choisie n'a pas donné, s'il y a lieu. */
  saisieEchec: "" };

/** Le nom du champ d'adresse, sur cet écran-ci. */
const SAISIE_DU_CLIMAT = "climat";

/**
 * Ce que la localisation résolue montre, une fois choisie.
 *
 * Ces quatre-là **se lisent**, ils ne se tapent plus : ils viennent de l'adresse.
 * Les montrer reste nécessaire — c'est avec eux qu'on relit un zonage six mois
 * plus tard, et c'est le code INSEE qui explique pourquoi un calcul part ou non.
 */
const LOCALISATION_RESOLUE = [
  { cle: "city", nom: "Commune" },
  { cle: "codeInsee", nom: "Code INSEE" },
  { cle: "postalCode", nom: "Code postal" },
  { cle: "altitude", nom: "Altitude", unite: "m" }
];

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

  // Comment elle s'appellera, demandé dans le geste. Un titre qu'on corrigerait
  // sur la proposition déjà ouverte serait un titre qu'on ne corrige pas. Rien
  // à demander quand on enrichit une branche : elle a déjà son nom.
  const nom = propositionId ? null : await demanderLeTitre({
    projectId: state.projectId, affirmations, zones, secours: buildClimateDraftTitle()
  });
  if (!propositionId && nom === null) return;

  state.transforming = true;
  state.error = "";
  render(root);

  const { preparerUneProposition } = await import("../../../services/atelier-proposition.js");
  const rendu = await preparerUneProposition({
    projectId: state.projectId,
    propositionId,
    titre: nom?.titre || buildClimateDraftTitle(),
    // Le résumé écrit devient l'introduction : la description garde ensuite la
    // liste des valeurs, qui n'a pas à disparaître parce qu'on a une phrase.
    intro: nom?.description
      || "La localisation du projet, les deux appels qui en découlent, et ce qu'ils posent. "
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
    if (!localisationCalculable(state.location)) throw new Error("Il manque le code INSEE de la commune : les tables de zonage se lisent par lui.");

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

/**
 * Prendre une localisation, et **en tirer tout de suite** ce qui en découle.
 *
 * L'altitude d'abord — elle se déduit des coordonnées, et la cote hors gel en
 * dépend —, puis les trois appels. Un seul chemin, qu'on vienne d'une adresse
 * choisie ou du bouton qui reprend celle du projet : deux chemins auraient fini
 * par ne pas recalculer les mêmes choses.
 */
async function prendreLaLocalisation(root, localisation) {
  state.location = localisation;
  state.saisieEchec = "";
  state.error = "";
  state.loading = true;
  render(root);

  // L'altitude ne vient pas du service d'adresses : elle se lit sur le relief,
  // aux coordonnées. Ce qu'on ne sait pas reste vide plutôt que de valoir zéro —
  // zéro mètre se calcule très bien jusqu'à une cote hors gel fausse (règle 5).
  const { latitude, longitude } = localisation ?? {};
  if (!Number.isFinite(Number(localisation?.altitude)) && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    try {
      const releve = await fetchFrenchAltitude({ latitude: Number(latitude), longitude: Number(longitude) });
      const metres = Number(releve?.altitude ?? releve);
      state.location = { ...state.location, altitude: Number.isFinite(metres) ? metres : null };
    } catch {
      state.location = { ...state.location, altitude: null };
    }
  }

  await calculateAll();
  render(root);
}

function render(root) {
  const hasResult = TOOL_KEYS.some((toolKey) => Boolean(state.results?.[toolKey]?.result_payload));

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
 * La localisation : **une adresse**, et ce qu'elle a résolu.
 *
 * Pré-remplie par celle du projet, et libre : c'est une saisie d'Atelier, elle
 * n'écrit rien. Ce qu'elle deviendra pour le projet passe par la proposition,
 * comme le reste.
 *
 * Les quatre valeurs en dessous **se lisent** : elles viennent de l'adresse, et
 * les taper à la main était le moyen le plus court de calculer la neige d'une
 * commune homonyme. Le code INSEE garde sa phrase parce qu'il est le seul qui
 * **bloque** — sans lui, les tables de zonage ne se lisent pas.
 */
function renderAddressCard() {
  const location = state.location || {};

  return `
    <article class="studio-tool-info-card climat-localisation">
      <h4>Localisation</h4>
      <p class="gh-text-muted climat-localisation__quoi">
        Ce avec quoi le calcul part. Elle vient du projet ; en choisir une autre ici
        ne change que ce calcul-ci — et le relance aussitôt.
      </p>

      ${renderSaisieAdresse({
        nom: SAISIE_DU_CLIMAT,
        label: "",
        valeur: adresseEnUneLigne(location),
        placeholder: "Ex. 12 avenue de la Gare, Annecy",
        desactive: state.loading
      })}

      ${state.loading ? `<p class="climat-localisation__attente">${renderSpinnerHtml({ label: "Calcul en cours", size: "sm" })} Calcul en cours…</p>` : ""}
      ${state.saisieEchec ? `<p class="climat-localisation__manque">${escapeHtml(state.saisieEchec)}</p>` : ""}

      <dl class="climat-localisation__resolu">
        ${LOCALISATION_RESOLUE.map((champ) => `
          <dt>${escapeHtml(champ.nom)}</dt>
          <dd>${escapeHtml(valeurLue(location, champ))}</dd>
        `).join("")}
      </dl>

      ${
        localisationCalculable(location)
          ? ""
          : `<p class="climat-localisation__manque">
              Le code INSEE désigne la commune sans ambiguïté — deux communes peuvent porter le même
              nom. Les tables de zonage se lisent par lui : sans code INSEE, rien ne se calcule.
              Choisissez une adresse dans la liste : il vient avec.
            </p>`
      }

      <button type="button" class="gh-btn gh-btn--sm" data-climat-reprendre ${state.loading ? "disabled" : ""}>
        Reprendre la localisation du projet
      </button>
    </article>
  `;
}

/**
 * Ce qu'une colonne résolue affiche. Vide s'affiche « — » et non « 0 ».
 *
 * L'altitude passe par l'écriture de la mémoire — virgule décimale, unité
 * collée —, parce que c'est ce qu'on relira sur la ligne versée : deux écritures
 * d'une même cote ne se comparent plus (règle 4).
 */
function valeurLue(location, champ) {
  if (champ.cle === "altitude") return mesure(location?.altitude, 2, "m") || "—";
  return String(location?.[champ.cle] ?? "").trim() || "—";
}

/**
 * Les gestes de l'écran.
 *
 * Il n'y a plus qu'un champ, et il ne se tape plus qu'une fois : choisir une
 * adresse relance le calcul, reprendre celle du projet aussi. Le bouton
 * « Calculer » a disparu — il ne faisait que répéter ce que le choix disait
 * déjà, en ajoutant un geste par essai à un écran fait pour essayer.
 */
function brancherLaSaisie(root) {
  brancherLaSaisieDAdresse(root, {
    nom: SAISIE_DU_CLIMAT,
    quandChoisie: (localisation) => prendreLaLocalisation(root, localisation),
    quandEchoue: (motif) => {
      // Se taire laisserait la carte et les zones sur l'adresse précédente,
      // qu'on croirait être celle qu'on vient de choisir.
      state.saisieEchec = motif;
      render(root);
    }
  });

  root.querySelector("[data-climat-reprendre]")?.addEventListener("click", () => {
    void prendreLaLocalisation(root, getEffectiveProjectLocation());
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
  // `Number(null)` vaut zéro, et zéro est un point au large du golfe de Guinée :
  // sans coordonnées, la carte reste floue — c'est ce qu'on veut voir quand le
  // projet n'a pas de localisation.
  const latitude = nombreOuRien(state.location?.latitude);
  const longitude = nombreOuRien(state.location?.longitude);
  if (!root || latitude === null || longitude === null) return;

  state.mapLoading = true;
  const host = root.querySelector("[data-solidity-climate-map]");
  if (host) host.innerHTML = renderMapCard();
  try {
    state.mapUrl = await fetchGoogleMapsPlaceEmbedUrl({ latitude, longitude, zoom: 16, mapType: "satellite" });
  } catch {
    state.mapUrl = "";
  } finally {
    state.mapLoading = false;
    if (host) host.innerHTML = renderMapCard();
  }
}
