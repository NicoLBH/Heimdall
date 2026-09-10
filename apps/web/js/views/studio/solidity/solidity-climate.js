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
 * ## Et le calcul part tout seul — sauf quand on cherche
 *
 * Choisir une adresse recalcule ; reprendre celle du projet recalcule. C'est ce
 * qu'on veut quand on **sait** où l'on va : un bouton entre les deux ajouterait
 * un geste par essai sans rien décider.
 *
 * Pointer sur la carte, c'est autre chose. On tâtonne — on déplace, on zoome, on
 * repose le marqueur trois fois avant de reconnaître la parcelle —, et
 * recalculer à chaque pose ferait trois appels au serveur pour un seul endroit.
 * Le bouton **Calculer** est donc là pour ce cas-là, et pour lui seul : il
 * s'allume dès qu'un point est posé, et c'est lui qui dit « c'est bien ici ».
 *
 * ## Le projet qui n'a pas d'adresse
 *
 * Il n'est pas construit. Il est dans un champ, et l'on connaît la commune. On
 * tape donc la commune, on arrive au-dessus du bourg, on se déplace jusqu'à
 * reconnaître le terrain sur la vue satellite, et l'on pose le point — appui
 * long, ou bouton qui prend le centre du viseur. Le service d'adresses rend
 * alors la commune **à l'envers**, depuis les coordonnées, si bien que ce
 * projet-là a un code INSEE comme les autres. Voir `ui/carte-a-pointer.js`.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { store } from "../../../store.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { getEffectiveProjectLocation } from "./solidity-climate-tool-common.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { renderTransformer, TRANSFORMER, brancheDeLAction } from "../../ui/transformer.js";
import { branchesOuvertes, rafraichirLesBranches } from "../../../services/branches-ouvertes.js";
import { avertirAvantDeProposer, renderPropositionOuverte } from "../../ui/avertissement-proposition.js";
import { demanderLeTitre } from "../../ui/titre-de-la-proposition.js";
import { lignesVersables, mesure } from "../../../services/climat-versement.js";
import { fetchGoogleMapsPlaceEmbedUrl } from "../../../services/google-maps-embed-service.js";
import { renderSaisieAdresse, brancherLaSaisieDAdresse } from "../../ui/saisie-adresse.js";
import { adresseEnUneLigne, localisationCalculable, localisationDeLAdresse, nombreOuRien } from "../../../services/adresse-saisie.js";
import { fetchFrenchAltitude, resolveFrenchCoordinates } from "../../../services/georisques-service.js";
import { creerLaCarteAPointer, brancherLaCarteAPointer, majCarteAPointer } from "../../ui/carte-a-pointer.js";
import { ZOOM_COMMUNE, ZOOM_PARCELLE, zoomBorne } from "../../../services/carte-pointee.js";
import { pointDit } from "../../../services/localisation-versement.js";
import { localisationDeLaMemoire } from "../../../services/localisation-du-projet.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
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
  /**
   * Où la carte regarde, et à quel zoom.
   *
   * **À part de `location`** : on s'éloigne pour se resituer sans que le projet
   * suive, et l'on revient. Les confondre ferait sauter le marqueur au milieu de
   * l'écran à chaque déplacement.
   */
  centre: null, zoom: ZOOM_COMMUNE,
  /** Le point posé, tant qu'on n'a pas cliqué « Calculer ». */
  pointe: null, pointeEnCours: false,
  /**
   * La carte, créée une fois et rattachée à chaque dessin.
   *
   * Le redessiner détruisait son `iframe`, que le navigateur rechargeait depuis
   * zéro : une page blanche s'allumait à chaque relâchement de la souris.
   */
  carte: null,
  results: {}, mapUrl: "", mapCle: "",
  /** Ce que la dernière adresse choisie n'a pas donné, s'il y a lieu. */
  saisieEchec: "",
  /**
   * La proposition qu'on vient d'ouvrir, tant qu'on est sur cet écran.
   *
   * L'écran partait sur Propositions > détail ; il reste ici et **offre** le
   * lien. Voir `views/ui/avertissement-proposition.js`.
   */
  propositionOuverte: null };

/** Le nom du champ d'adresse, sur cet écran-ci. */
const SAISIE_DU_CLIMAT = "climat";

/** Le nom de la carte qu'on pointe, sur cet écran-ci. */
const CARTE_DU_CLIMAT = "climat";

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
  { cle: "postalCode", nom: "Code postal" }
  // Pas l'altitude : la carte « Neige » la porte déjà, et deux fois la même
  // mesure à trente centimètres l'une de l'autre fait chercher la différence.
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

  // Prévenir **avant** tout le reste. Ce lot change huit lignes d'un coup — la
  // localisation, l'altitude, les deux appels, les quatre valeurs —, et l'on
  // clique « Transformer » en croyant proposer une zone de neige. La fenêtre
  // les montre, et rappelle que rien n'entre avant la fusion.
  const ou = await avertirAvantDeProposer({
    quoi: "Les zones et charges climatiques calculées ici vont être proposées à la mémoire "
      + "du projet, avec la localisation et l'altitude qui les ont produites.",
    affirmations,
    memoire: await memoireDuProjet(),
    // Le menu « Transformer » a déjà demandé où : la redemander serait poser
    // deux fois la même question dans le même geste.
    imposee: propositionId
      ? (branchesOuvertes() ?? []).find((branche) => String(branche.id) === String(propositionId))
        ?? { id: propositionId, libelle: "la proposition choisie" }
      : null,
    branches: branchesOuvertes()
  });
  if (!ou) return;

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
    // Celle que la fenêtre a retenue : le menu peut avoir dit « nouvelle », et
    // c'est la fenêtre qui a le dernier mot puisque c'est elle qu'on a lue.
    propositionId: ou.propositionId || propositionId,
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
  // Et c'est la même lecture qui repose le compteur de la barre d'onglets.
  void rafraichirLesBranches();

  // **On reste ici.** L'écran partait sur Propositions > détail, ce qui faisait
  // perdre le fil de ce qu'on était en train de régler : on venait d'essayer une
  // adresse, on en essayait une autre, et l'on se retrouvait ailleurs. Le lien
  // vers la proposition est offert, il n'est pas imposé.
  state.propositionOuverte = {
    id: rendu.proposition.id,
    numero: rendu.proposition.number ?? null,
    titre: nom?.titre || buildClimateDraftTitle(),
    // Ce qui n'a pas pu être porté se dit **ici**, puisqu'on ne quitte plus
    // l'écran : le taire ferait croire que tout est passé.
    tranches: rendu.tranches ?? []
  };
  render(root);
}

/**
 * Ce que la mémoire du projet dit aujourd'hui, pour la fenêtre d'avertissement.
 *
 * `null` quand on n'a pas pu la lire : la fenêtre l'écrit plutôt que d'afficher
 * « rien aujourd'hui » sur huit lignes qui existent peut-être (règle 5).
 */
async function memoireDuProjet() {
  try {
    const { listProjectAssertions } = await import("../../../services/project-memory-supabase.js");
    return await listProjectAssertions(state.projectId);
  } catch {
    return null;
  }
}

async function hydrateState() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    if (!state.projectId) throw new Error("Projet introuvable.");

    // **À chaque venue**, et depuis la mémoire. On la gardait d'un montage à
    // l'autre pour ne pas perdre une saisie en cours, et l'on affichait alors
    // l'adresse d'avant après avoir fusionné la proposition qui la corrigeait —
    // par soi, ou par un collègue. Rien ne disait que c'était faux, et le calcul
    // serait parti sur celle-là. Voir `services/localisation-du-projet.js`.
    state.location = localisationDeLaMemoire(await memoireDuProjet()) ?? getEffectiveProjectLocation();
    state.pointe = null;
    recentrer(state.location, ZOOM_PARCELLE);

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
async function prendreLaLocalisation(root, localisation, { zoom = null } = {}) {
  state.location = localisation;
  state.pointe = null;
  state.saisieEchec = "";
  state.error = "";
  state.loading = true;
  // La carte suit ce qu'on vient de retenir. Le zoom aussi : on arrive au-dessus
  // du bourg quand on a tapé une commune, au-dessus de la parcelle quand on a
  // pointé — chercher son terrain à l'échelle du département ne se fait pas.
  recentrer(localisation, zoom);
  render(root);

  // L'altitude ne vient pas du service d'adresses : elle se lit sur le relief,
  // aux coordonnées. Ce qu'on ne sait pas reste vide plutôt que de valoir zéro —
  // zéro mètre se calcule très bien jusqu'à une cote hors gel fausse (règle 5).
  const latitude = nombreOuRien(localisation?.latitude);
  const longitude = nombreOuRien(localisation?.longitude);
  if (nombreOuRien(localisation?.altitude) === null && latitude !== null && longitude !== null) {
    state.location = { ...state.location, altitude: await releverLAltitude({ latitude, longitude }) };
  }

  await calculateAll();
  recentrer(state.location, zoom);
  render(root);
}

/** Poser la carte sur une localisation, sans toucher au projet. */
function recentrer(localisation, zoom = null) {
  const latitude = nombreOuRien(localisation?.latitude);
  const longitude = nombreOuRien(localisation?.longitude);
  if (latitude === null || longitude === null) return;

  state.centre = { latitude, longitude };
  if (zoom !== null) state.zoom = zoomBorne(zoom);
}

/**
 * Poser le projet là où l'on vient d'appuyer.
 *
 * Le service d'adresses rend la commune **à l'envers**, depuis les coordonnées :
 * c'est ce qui donne un code INSEE à un projet qui n'a pas d'adresse. Il ne rend
 * pas d'adresse — celle du voisin n'est pas celle du projet, et l'écrire ferait
 * entrer en mémoire un fait que personne n'a constaté (règle 5).
 *
 * Rien n'est calculé ici : on tâtonne, on repose le marqueur, et trois appels au
 * serveur pour un seul endroit ne servent à personne. C'est « Calculer » qui
 * dit « c'est bien ici ».
 */
async function poserLeProjet(root, point) {
  state.pointe = point;
  state.pointeEnCours = true;
  state.saisieEchec = "";
  // La carte se recentre sur ce qu'on vient de poser. Sans cela, on pose un
  // point au bord du cadre, on ne voit plus l'ancien, et l'on ne comprend pas ce
  // qui remplace quoi.
  recentrer(point);
  render(root);

  try {
    const commune = localisationDeLAdresse(await resolveFrenchCoordinates(point));
    const altitude = await releverLAltitude(point);
    state.pointe = { ...commune, ...point, altitude };
  } catch (erreur) {
    // Se taire laisserait un marqueur posé sans commune, et « Calculer » aurait
    // refusé sans dire pourquoi.
    state.saisieEchec = erreur instanceof Error ? erreur.message : String(erreur);
  } finally {
    state.pointeEnCours = false;
    render(root);
  }
}

/** L'altitude d'un point, ou `null`. Elle se lit sur le relief, aux coordonnées. */
async function releverLAltitude({ latitude, longitude } = {}) {
  try {
    const releve = await fetchFrenchAltitude({ latitude, longitude });
    return nombreOuRien(releve?.altitude ?? releve);
  } catch {
    return null;
  }
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
                ${
                  // Le bouton n'existe que pour le point posé sur la carte. Une
                  // adresse choisie recalcule d'elle-même ; un point, on le
                  // repose trois fois avant de reconnaître la parcelle, et c'est
                  // ce bouton qui dit « c'est bien ici ».
                  state.pointe
                    ? renderGhActionButton({
                        id: "solidityToolCalculate-climate",
                        label: state.loading ? "Calcul en cours…" : "Calculer ici",
                        tone: "primary", size: "md", mainAction: "",
                        disabled: Boolean(state.loading) || state.pointeEnCours || !localisationCalculable(state.pointe)
                      })
                    : ""
                }
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          ${state.error ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>` : ""}
          ${renderPropositionOuverte({
            projet: String(store.currentProjectId || "").trim(),
            proposition: state.propositionOuverte
          })}
          <div data-solidity-climate-map class="studio-tool-map-layer"></div>
          <div class="studio-tool-overlay-grid" style="display:grid;grid-template-columns:300px minmax(0px, 1fr);gap:16px;align-items:start;">
            ${renderCards()}
          </div>
        </div>
      </div>
    </section>
  `;
  brancherLaSaisie(root);
  poserLaCarte(root);

  root.querySelector('[data-action-id="solidityToolCalculate-climate"]')
    ?.addEventListener("click", () => { void prendreLaLocalisation(root, state.pointe, { zoom: ZOOM_PARCELLE }); });

  void refreshMapCard(root);
}

/**
 * Rattacher la carte, et la mettre à jour.
 *
 * **Le même nœud à chaque dessin.** Le redessiner détruisait l'`iframe` de la
 * vue satellite, que le navigateur rechargeait alors depuis zéro : une page
 * blanche s'allumait à chaque relâchement de la souris. On cassait nous-mêmes le
 * fonctionnement de la carte, qui sait très bien changer de centre toute seule.
 */
function poserLaCarte(root) {
  if (!state.carte) {
    state.carte = creerLaCarteAPointer({ nom: CARTE_DU_CLIMAT, hauteur: "calc(100vh - 260px)" });
    brancherLaCarteAPointer(state.carte, {
      // Une fonction, et non l'état capturé : l'écran change, et un objet pris à
      // la liaison porterait le centre d'il y a trois déplacements.
      etat: () => ({ centre: state.centre, point: leMarqueur(), zoom: state.zoom }),
      quandDeplacee: (centre) => { state.centre = centre; void refreshMapCard(root); },
      quandZoomee: (zoom) => { state.zoom = zoom; void refreshMapCard(root); },
      quandPointee: (point) => { void poserLeProjet(root, point); }
    });
  }

  root.querySelector("[data-solidity-climate-map]")?.appendChild(state.carte);
  majCarteAPointer(state.carte, {
    centre: state.centre, point: leMarqueur(), zoom: state.zoom, embedUrl: state.mapUrl
  });
}

/**
 * Le marqueur, et il n'y en a qu'un.
 *
 * Celui qu'on vient de poser s'il y en a un, celui du projet sinon. Il y en a eu
 * deux le temps d'une version — l'ancien en bleu, le nouveau en rouge — et ils
 * se recouvraient : le marqueur est **déplaçable** maintenant, et un endroit
 * qu'on déplace n'a pas besoin de son fantôme à côté.
 */
function leMarqueur() {
  return pointDe(state.pointe) ?? pointDe(state.location);
}

function pointDe(localisation) {
  const latitude = nombreOuRien(localisation?.latitude);
  const longitude = nombreOuRien(localisation?.longitude);
  return latitude === null || longitude === null ? null : { latitude, longitude };
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

      ${renderSaisieAdresse({
        nom: SAISIE_DU_CLIMAT,
        label: "",
        valeur: adresseEnUneLigne(location),
        placeholder: "Une adresse, ou seulement la commune…",
        desactive: state.loading
      })}

      ${state.loading ? `<p class="climat-localisation__attente">${renderSpinnerHtml({ label: "Calcul en cours", size: "sm" })} Calcul en cours…</p>` : ""}

      ${renderPointPose()}

      <dl class="climat-localisation__resolu">
        ${LOCALISATION_RESOLUE.map((champ) => `
          <dt>${escapeHtml(champ.nom)}</dt>
          <dd>${escapeHtml(valeurLue(location, champ))}</dd>
        `).join("")}
      </dl>

      ${
        // Sans code INSEE, rien ne se calcule — et il faut le dire. Mais **une
        // seule fois** : quand un point vient d'être posé, c'est sa ligne à lui
        // qui porte la phrase, et la répéter ici ferait chercher deux causes.
        localisationCalculable(location) || state.pointe
          ? ""
          : `<p class="climat-localisation__manque">
              Le code INSEE désigne la commune sans ambiguïté — deux communes peuvent porter le même
              nom. Les tables de zonage se lisent par lui : sans code INSEE, rien ne se calcule.
            </p>`
      }

      <button type="button" class="gh-btn gh-btn--sm" data-climat-reprendre ${state.loading ? "disabled" : ""}>
        Reprendre la localisation du projet
      </button>
    </article>
  `;
}

/**
 * Le point posé sur la carte, tant que « Calculer » ne l'a pas retenu.
 *
 * Il se montre **à part** de la localisation d'aujourd'hui : ce sont deux
 * endroits, et les mélanger ferait croire que le projet a déjà bougé alors qu'on
 * est en train de chercher.
 */
function renderPointPose() {
  if (!state.pointe) return "";

  const commune = String(state.pointe.city || "").trim();
  const insee = String(state.pointe.codeInsee || "").trim();

  return `
    <div class="climat-localisation__pointe">
      <b>${svgIcon("location", { className: "octicon" })} Point posé</b>
      <span class="climat-localisation__coords">${escapeHtml(pointDit({
        latitude: state.pointe.latitude, longitude: state.pointe.longitude
      }) || "—")}</span>
      ${
        state.pointeEnCours
          ? `<span class="climat-localisation__attente">${renderSpinnerHtml({ label: "Recherche de la commune", size: "sm" })} Recherche de la commune…</span>`
          : insee
            ? `<span>${escapeHtml(commune || "commune inconnue")} · INSEE ${escapeHtml(insee)}
                 · ${escapeHtml(mesure(state.pointe.altitude, 2, "m") || "altitude inconnue")}</span>`
            : `<span class="climat-localisation__manque">${escapeHtml(
                // **Une seule** alerte, et celle qui dit vrai. Il y en avait deux
                // — l'une sous le champ, l'autre ici — et toutes deux annonçaient
                // « aucune commune trouvée à cet endroit », ce qui est faux
                // partout sauf en mer : on interrogeait la base des **adresses**,
                // qui n'en trouve aucune au milieu d'un champ.
                state.saisieEchec || "Ce point n'est dans aucune commune française."
              )}</span>`
      }
    </div>
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
    // Le zoom d'arrivée : le bourg quand on a tapé une commune sans numéro, la
    // parcelle quand l'adresse en portait un. Chercher son terrain à l'échelle
    // du département ne se fait pas.
    quandChoisie: (localisation) => prendreLaLocalisation(root, localisation, {
      zoom: String(localisation?.address || "").trim() ? ZOOM_PARCELLE : ZOOM_COMMUNE
    }),
    quandEchoue: (motif) => {
      // Se taire laisserait la carte et les zones sur l'adresse précédente,
      // qu'on croirait être celle qu'on vient de choisir. La phrase s'affiche
      // sous le point posé, et **là seulement** : deux alertes pour un échec
      // font chercher deux causes.
      state.pointe = { ...(state.pointe ?? {}), codeInsee: "" };
      state.saisieEchec = motif;
      render(root);
    }
  });

  root.querySelector("[data-climat-reprendre]")?.addEventListener("click", () => {
    // Relue, jamais reprise d'un cache : c'est le geste qui dit « remets-moi ce
    // que le projet tient pour vrai », et une photo d'il y a dix minutes n'est
    // pas cela.
    void (async () => {
      const memoire = localisationDeLaMemoire(await memoireDuProjet()) ?? getEffectiveProjectLocation();
      await prendreLaLocalisation(root, memoire, { zoom: ZOOM_PARCELLE });
    })();
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

async function refreshMapCard(root) {
  // La carte suit le **centre**, qui n'est pas le projet : on s'éloigne pour se
  // resituer, on revient, et le marqueur ne bouge pas pendant ce temps.
  //
  // `Number(null)` vaut zéro, et zéro est un point au large du golfe de Guinée :
  // sans coordonnées, la carte reste floue — c'est ce qu'on veut voir quand le
  // projet n'a pas de localisation.
  const latitude = nombreOuRien(state.centre?.latitude);
  const longitude = nombreOuRien(state.centre?.longitude);
  if (!root || latitude === null || longitude === null) return;

  // Rien à redemander si c'est déjà ce qu'on affiche.
  const cle = `${latitude.toFixed(6)}|${longitude.toFixed(6)}|${state.zoom}`;
  if (cle === state.mapCle) return;
  state.mapCle = cle;

  // **Le marqueur bouge tout de suite**, la vue arrive après : sans cela, on
  // relâche la souris et le marqueur reste une demi-seconde sur l'endroit
  // d'avant. La vue précédente reste affichée pendant ce temps — la remplacer
  // par un vide est exactement ce qui faisait clignoter la carte.
  poserLaCarte(root);

  try {
    const vue = await fetchGoogleMapsPlaceEmbedUrl({ latitude, longitude, zoom: state.zoom, mapType: "satellite" });
    // Un centre a pu changer pendant l'attente : la vue qui arrive porte alors
    // sur un endroit qu'on ne regarde plus, et l'afficher ferait sauter la carte.
    if (cle !== state.mapCle) return;
    state.mapUrl = vue;
  } catch {
    state.mapUrl = "";
    // La clé s'oublie : sans cela, une panne de réseau figerait la carte sur le
    // dernier endroit qui a répondu, et se déplacer ne ferait plus rien.
    state.mapCle = "";
  } finally {
    poserLaCarte(root);
  }
}
