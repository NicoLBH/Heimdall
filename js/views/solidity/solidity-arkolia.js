import { searchFrenchCommunes, fetchFrenchAltitude } from "../../services/georisques-service.js";
import { getCantonByCommuneCode } from "../../services/zoning/canton-service.js";
import { getWindRegionsByDepartmentCode } from "../../services/zoning/wind-regions-service.js";
import { getSnowRegionsByDepartmentCode } from "../../services/zoning/snow-regions-service.js";
import { getWindZoneByDepartmentAndCanton } from "../../services/zoning/wind-canton-regions-service.js";
import { getSnowZoneByDepartmentAndCanton, getAllSnowCantonRegions } from "../../services/zoning/snow-canton-regions-service.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { buildGoogleMapsPlaceEmbedUrl, hasGoogleMapsEmbedApiKey } from "../../services/google-maps-embed-service.js";
import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";
import { svgIcon } from "../../ui/icons.js";

const arkoliaUiState = {
  query: "",
  suggestions: [],
  selected: null,
  isLoading: false,
  activeIndex: -1,
  isOpen: false,
  requestSequence: 0,
  debounceTimer: null
};

let currentRoot = null;
let snowCantonRegionsCache = [];

function resetSuggestions() {
  arkoliaUiState.suggestions = [];
  arkoliaUiState.activeIndex = -1;
  arkoliaUiState.isOpen = false;
  arkoliaUiState.isLoading = false;
}

function normalizeAltitude(value) {
  return Number.isFinite(value) ? `${value} m` : "—";
}

function normalizeCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "—";
}

function renderGoogleMapsBlock(selected) {
  const latitude = Number(selected?.lat);
  const longitude = Number(selected?.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return `
      <div class="arkolia-map__notice">Coordonnées indisponibles : la carte ne peut pas être affichée.</div>
    `;
  }

  if (!hasGoogleMapsEmbedApiKey()) {
    return `
      <div class="arkolia-map__notice">
        Clé Google Maps absente. Renseignez <code>window.MDALL_CONFIG.googleMapsEmbedApiKey</code> dans <code>index.html</code> ou la meta <code>google-maps-embed-api-key</code> pour afficher la carte interactive.
      </div>
    `;
  }

  const embedUrl = buildGoogleMapsPlaceEmbedUrl({ latitude, longitude, zoom: 14 });
  if (!embedUrl) {
    return `
      <div class="arkolia-map__notice">La carte Google Maps n'a pas pu être générée.</div>
    `;
  }

  return `
    <div class="arkolia-map">
      <iframe
        title="Carte Google Maps de la commune sélectionnée"
        src="${escapeHtml(embedUrl)}"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  `;
}

function formatWindRegions(regions = []) {
  return Array.isArray(regions) && regions.length ? regions.join(" ; ") : "—";
}

function formatSnowRegions(regions = []) {
  return Array.isArray(regions) && regions.length ? regions.join(" / ") : "—";
}

function renderSnowCantonsVerificationTable() {
  if (!Array.isArray(snowCantonRegionsCache) || !snowCantonRegionsCache.length) {
    return `
      <div class="settings-card settings-card--param">
        <div class="settings-card__head">
          <div>
            <span class="settings-card__head-title"><h4>Répartition des zones de neige par canton</h4></span>
            <p>Chargement du tableau de vérification…</p>
          </div>
        </div>
      </div>
    `;
  }

  const rows = snowCantonRegionsCache.map((department) => {
    const zoneRows = Array.isArray(department.zoneRows) ? department.zoneRows : [];
    return zoneRows.map((zoneRow, index) => `
      <tr>
        <td>${index === 0 ? escapeHtml(department.departmentCode || "—") : ""}</td>
        <td>${index === 0 ? escapeHtml(department.departmentName || "—") : ""}</td>
        <td>${escapeHtml(zoneRow.snowRegion || "—")}</td>
        <td>${escapeHtml((Array.isArray(zoneRow.cantons) ? zoneRow.cantons : []).join(", ") || "—")}</td>
      </tr>
    `).join("");
  }).join("");

  return `
    <div class="settings-card settings-card--param">
      <div class="settings-card__head">
        <div>
          <span class="settings-card__head-title"><h4>Répartition des zones de neige par canton</h4></span>
          <p>Tableau complet de contrôle du JSON neige canton, sur le modèle du tableau source.</p>
        </div>
      </div>
      <div class="settings-table-wrap">
        <table class="settings-table settings-table--compact">
          <thead>
            <tr>
              <th>N° département</th>
              <th>Département</th>
              <th>Région(s)</th>
              <th>Cantons</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAutocompleteDropdown() {
  if (!currentRoot) return;

  const input = currentRoot.querySelector('[data-arkolia-city-input]');
  const dropdown = currentRoot.querySelector('[data-arkolia-city-suggestions]');
  if (!input || !dropdown) return;

  const isOpen = arkoliaUiState.isOpen && (arkoliaUiState.isLoading || arkoliaUiState.suggestions.length > 0);
  input.setAttribute("aria-expanded", isOpen ? "true" : "false");
  dropdown.hidden = !isOpen;

  if (!isOpen) {
    dropdown.innerHTML = "";
    return;
  }

  if (arkoliaUiState.isLoading) {
    dropdown.innerHTML = '<div class="gh-autocomplete__status">Recherche…</div>';
    return;
  }

  dropdown.innerHTML = arkoliaUiState.suggestions.map((item, index) => {
    const isActive = index === arkoliaUiState.activeIndex;
    const primary = item.label || item.name || "—";
    const meta = [item.postalCodes?.join(", ") || item.postalCode || "", item.codeInsee ? `INSEE ${item.codeInsee}` : ""]
      .filter(Boolean)
      .join(" · ");

    return `
      <button
        type="button"
        class="gh-autocomplete__item ${isActive ? "is-active" : ""}"
        data-arkolia-city-option-index="${index}"
        role="option"
        aria-selected="${isActive ? "true" : "false"}"
      >
        <span class="gh-autocomplete__item-main">${escapeHtml(primary)}</span>
        ${meta ? `<span class="gh-autocomplete__item-meta">${escapeHtml(meta)}</span>` : ""}
      </button>
    `;
  }).join("");
}


function renderResultCard() {
  if (!currentRoot) return;

  const mount = currentRoot.querySelector('[data-arkolia-result]');
  if (!mount) return;

  const selected = arkoliaUiState.selected;
  if (!selected) {
    mount.innerHTML = renderSnowCantonsVerificationTable();
    return;
  }

  const cityTitle = escapeHtml(selected.name || selected.label || "Ville sélectionnée");
  const hasCantonMismatch = Boolean(selected.hasCantonMismatch);
  const cityTitleHtml = hasCantonMismatch
    ? `<span style="display:inline-flex;align-items:center;gap:8px;">${svgIcon("alert", { className: "octicon octicon-alert", title: "Attention : canton actuel différent du canton 2014" })}<span>${cityTitle}</span></span>`
    : cityTitle;

  mount.innerHTML = `
    <div class="settings-card settings-card--param">
      <div class="settings-card__head">
        <div>
          <span class="settings-card__head-title"><h4>${cityTitleHtml}</h4></span>
          <p>Données récupérées à partir de la suggestion sélectionnée.</p>
        </div>
      </div>
      <div class="settings-stack settings-stack--sm">
        <div><strong>code INSEE :</strong> ${escapeHtml(selected.codeInsee || "—")}</div>
        <div><strong>département :</strong> ${escapeHtml(selected.departmentCode || "—")}</div>
        <div><strong>canton actuel :</strong> ${escapeHtml(selected.currentCantonName || "—")}</div>
        <div><strong>canton 2014 :</strong> ${escapeHtml(selected.cantonName || "—")}</div>
        <div><strong>Altitude :</strong> ${escapeHtml(normalizeAltitude(selected.altitude))}</div>
        <div><strong>Latitude :</strong> ${escapeHtml(normalizeCoordinate(selected.lat))}</div>
        <div><strong>Longitude :</strong> ${escapeHtml(normalizeCoordinate(selected.lon))}</div>
        <div><strong>N° département :</strong> ${escapeHtml(selected.departmentCode || "—")}</div>
        <div><strong>Nom département :</strong> ${escapeHtml(selected.departmentName || "—")}</div>
        <div><strong>régions vent :</strong> ${escapeHtml(formatWindRegions(selected.windRegions))}</div>
        <div><strong>zone de vent :</strong> ${escapeHtml(selected.windZone || "—")}</div>
        <div><strong>régions neige :</strong> ${escapeHtml(formatSnowRegions(selected.snowRegions))}</div>
        <div><strong>zone de neige :</strong> ${escapeHtml(selected.snowZone || "—")}</div>
      </div>
      <div class="settings-stack settings-stack--sm arkolia-map-block">
        <div><strong>Carte :</strong></div>
        ${renderGoogleMapsBlock(selected)}
      </div>
    </div>

    ${renderSnowCantonsVerificationTable()}
  `;
}

async function applySelection(item) {
  if (!item || !currentRoot) return;

  const input = currentRoot.querySelector('[data-arkolia-city-input]');
  if (input) {
    input.value = item.name || item.label || "";
  }

  let altitude = null;
  let cantonName = "";
  let cantonName2014 = "";
  let currentCantonName = "";
  let departmentName = "";
  let windRegions = [];
  let windZone = "";
  let snowRegions = [];
  let snowZone = "";

  const [altitudeResult, cantonResult, windRegionsResult, snowRegionsResult] = await Promise.allSettled([
    fetchFrenchAltitude({ longitude: item.lon, latitude: item.lat }),
    getCantonByCommuneCode(item.codeInsee),
    getWindRegionsByDepartmentCode(item.departmentCode),
    getSnowRegionsByDepartmentCode(item.departmentCode)
  ]);

  if (altitudeResult.status === 'fulfilled') {
    altitude = altitudeResult.value?.altitude ?? null;
  }

  if (cantonResult.status === 'fulfilled') {
    cantonName = cantonResult.value?.cantonName || "";
    cantonName2014 = cantonResult.value?.cantonName2014 || cantonResult.value?.cantonName || "";
    currentCantonName = cantonResult.value?.cantonNameCurrent || "";
  }

  if (windRegionsResult.status === 'fulfilled') {
    departmentName = windRegionsResult.value?.departmentName || "";
    windRegions = Array.isArray(windRegionsResult.value?.windRegions) ? windRegionsResult.value.windRegions : [];
  }

  if (snowRegionsResult.status === 'fulfilled') {
    if (!departmentName) {
      departmentName = snowRegionsResult.value?.departmentName || "";
    }
    snowRegions = Array.isArray(snowRegionsResult.value?.snowRegions) ? snowRegionsResult.value.snowRegions : [];
  }

  if (cantonName) {
    try {
      const windZoneResult = await getWindZoneByDepartmentAndCanton(item.departmentCode, cantonName);
      windZone = windZoneResult?.windZone ? String(windZoneResult.windZone) : "";
    } catch (_error) {
      windZone = "";
    }
  } else if (Array.isArray(windRegions) && windRegions.length === 1) {
    windZone = String(windRegions[0]);
  }

  if (cantonName) {
    try {
      const snowZoneResult = await getSnowZoneByDepartmentAndCanton(item.departmentCode, cantonName);
      snowZone = snowZoneResult?.snowZone ? String(snowZoneResult.snowZone) : "";
    } catch (_error) {
      snowZone = "";
    }
  } else if (Array.isArray(snowRegions) && snowRegions.length === 1) {
    snowZone = String(snowRegions[0]);
  }

  arkoliaUiState.query = item.name || item.label || "";
  const normalizedCurrentCantonName = String(currentCantonName || "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const normalizedCantonName2014 = String(cantonName2014 || cantonName || "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  arkoliaUiState.selected = {
    ...item,
    altitude,
    cantonName: cantonName2014 || cantonName,
    cantonName2014: cantonName2014 || cantonName,
    currentCantonName,
    hasCantonMismatch: Boolean(normalizedCurrentCantonName && normalizedCantonName2014 && normalizedCurrentCantonName !== normalizedCantonName2014),
    departmentName,
    windRegions,
    windZone,
    snowRegions,
    snowZone
  };
  resetSuggestions();
  renderAutocompleteDropdown();
  renderResultCard();
}

function bindCityAutocomplete() {
  if (!currentRoot) return;

  const wrapper = currentRoot.querySelector('[data-arkolia-city-field]');
  const input = currentRoot.querySelector('[data-arkolia-city-input]');
  const dropdown = currentRoot.querySelector('[data-arkolia-city-suggestions]');
  if (!wrapper || !input || !dropdown || input.dataset.autocompleteBound === 'true') return;

  input.dataset.autocompleteBound = 'true';

  const closeDropdown = () => {
    resetSuggestions();
    renderAutocompleteDropdown();
  };

  input.addEventListener('input', () => {
    const query = String(input.value || '').trim();
    arkoliaUiState.query = query;
    arkoliaUiState.selected = null;
    renderResultCard();

    if (arkoliaUiState.debounceTimer) {
      clearTimeout(arkoliaUiState.debounceTimer);
      arkoliaUiState.debounceTimer = null;
    }

    if (query.length < 2) {
      closeDropdown();
      return;
    }

    arkoliaUiState.isLoading = true;
    arkoliaUiState.isOpen = true;
    arkoliaUiState.suggestions = [];
    arkoliaUiState.activeIndex = -1;
    renderAutocompleteDropdown();

    const requestId = ++arkoliaUiState.requestSequence;
    arkoliaUiState.debounceTimer = setTimeout(async () => {
      try {
        const items = await searchFrenchCommunes({ query, limit: 6 });
        if (requestId !== arkoliaUiState.requestSequence) return;
        arkoliaUiState.suggestions = items;
        arkoliaUiState.isLoading = false;
        arkoliaUiState.isOpen = items.length > 0;
        arkoliaUiState.activeIndex = items.length ? 0 : -1;
        renderAutocompleteDropdown();
      } catch (_error) {
        if (requestId !== arkoliaUiState.requestSequence) return;
        closeDropdown();
      }
    }, 180);
  });

  input.addEventListener('keydown', (event) => {
    if (!arkoliaUiState.isOpen || !arkoliaUiState.suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      arkoliaUiState.activeIndex = (arkoliaUiState.activeIndex + 1) % arkoliaUiState.suggestions.length;
      renderAutocompleteDropdown();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      arkoliaUiState.activeIndex = (arkoliaUiState.activeIndex - 1 + arkoliaUiState.suggestions.length) % arkoliaUiState.suggestions.length;
      renderAutocompleteDropdown();
      return;
    }

    if (event.key === 'Enter') {
      const selected = arkoliaUiState.suggestions[arkoliaUiState.activeIndex] || arkoliaUiState.suggestions[0];
      if (!selected) return;
      event.preventDefault();
      applySelection(selected);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    }
  });

  dropdown.addEventListener('mousedown', (event) => {
    const option = event.target.closest('[data-arkolia-city-option-index]');
    if (!option) return;
    event.preventDefault();
    const index = Number(option.getAttribute('data-arkolia-city-option-index'));
    const selected = arkoliaUiState.suggestions[index];
    applySelection(selected);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!document.activeElement || !dropdown.contains(document.activeElement)) {
        closeDropdown();
      }
    }, 120);
  });

  currentRoot.addEventListener('click', (event) => {
    if (!event.target.closest('[data-arkolia-city-field]')) {
      closeDropdown();
    }
  });
}

export async function renderSolidityArkolia(root) {
  if (!root) return;
  currentRoot = root;
  resetSuggestions();
  arkoliaUiState.selected = null;
  arkoliaUiState.query = "";

  try {
    snowCantonRegionsCache = await getAllSnowCantonRegions();
  } catch (_error) {
    snowCantonRegionsCache = [];
  }

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="settings-card settings-card--param">
        <div class="settings-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Arkolia</h4>
            </span>
            <p>Utilitaire autonome de recherche par ville avec auto-complétion, récupération du canton 2014 par code INSEE, affichage des coordonnées, détermination automatique des zones de vent et de neige, avec tableau complet de vérification du découpage neige par canton.</p>
          </div>
        </div>

        <div class="settings-stack settings-stack--lg">
          <div class="gh-editable-field gh-editable-field--autocomplete" data-arkolia-city-field>
            <div class="gh-editable-field__label-row">
              <span class="gh-editable-field__label">Ville</span>
            </div>
            <div class="gh-editable-field__control">
              <input
                id="solidityArkoliaCity"
                type="text"
                class="gh-input"
                placeholder="Rechercher une ville"
                autocomplete="off"
                data-arkolia-city-input
                aria-autocomplete="list"
                aria-expanded="false"
                aria-controls="solidityArkoliaCitySuggestions"
              />
              <div
                id="solidityArkoliaCitySuggestions"
                class="gh-autocomplete gh-autocomplete--cities"
                data-arkolia-city-suggestions
                role="listbox"
                hidden
              ></div>
            </div>
          </div>

          <div data-arkolia-result></div>
        </div>
      </div>
    </section>
  `;

  bindCityAutocomplete();
  renderAutocompleteDropdown();
  renderResultCard();
  registerProjectPrimaryScrollSource(root.closest("#projectSolidityRouterScroll") || document.getElementById("projectSolidityRouterScroll"));
}
