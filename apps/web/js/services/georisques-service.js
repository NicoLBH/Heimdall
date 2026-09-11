const COMMUNES_API_URL = "https://geo.api.gouv.fr/communes";
const ADDRESS_API_URL = "https://api-adresse.data.gouv.fr/search/";
const IGN_COMPLETION_API_URL = "https://data.geopf.fr/geocodage/completion/";
const IGN_ELEVATION_API_URL = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json";
const GEORISQUES_API_BASE = "https://www.georisques.gouv.fr/api/v1";

const GEORISQUES_COMMUNE_ENDPOINTS = [
  { key: "risques", label: "Risques", paths: ["gaspar/risques"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "ppr", label: "PPR", paths: ["ppr"] },
  { key: "catnat", label: "CATNAT", paths: ["gaspar/catnat"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "dicrim", label: "DICRIM", paths: ["gaspar/dicrim"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "tim", label: "TIM", paths: ["gaspar/tim"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "papi", label: "PAPI", paths: ["gaspar/papi"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "azi", label: "AZI", paths: ["gaspar/azi"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "tri", label: "TRI", paths: ["gaspar/tri"], queryMode: "radiusLatlonOrCodeInsee" },
  {
    key: "tri_zonage_reglementaire",
    label: "TRI - Zonage réglementaire",
    paths: ["tri_zonage"],
    queryMode: "latlonOnly"
  },
  { key: "radon", label: "RADON", paths: ["radon"] },
  {
    key: "zonage_sismique",
    label: "Zonage sismique",
    paths: ["zonage_sismique", "zonage-sismique"]
  },
  { key: "cavites", label: "Cavités", paths: ["cavites"] },
  { key: "mvt", label: "MVT", paths: ["mvt"] },
  {
    key: "retrait_gonflement_argiles",
    label: "Retrait gonflement des argiles",
    paths: ["rga"],
    queryMode: "latlonOnly"
  },
  {
    key: "installations_classees",
    label: "Installations classées",
    paths: ["installations_classees", "installations-classees"]
  }
];

const GEORISQUES_POINT_RADIUS_METERS = 1000;

function safeString(value = "") {
  return String(value ?? "").trim();
}

function normalizeString(value = "") {
  return safeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toCoordsFromGeometry(geometry) {
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  return {
    lon: toNumber(coordinates[0]),
    lat: toNumber(coordinates[1])
  };
}

function formatGeorisquesPoint(lon, lat) {
  const safeLon = toNumber(lon);
  const safeLat = toNumber(lat);

  if (!Number.isFinite(safeLon) || !Number.isFinite(safeLat)) {
    return "";
  }

  return `${safeLon},${safeLat}`;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function buildEndpointUrl(path, context = {}) {
  const url = new URL(`${GEORISQUES_API_BASE}/${path}`);
  const queryMode = safeString(context.queryMode || "codeInsee");
  const codeInsee = safeString(context.codeInsee);

  if (queryMode === "latlonOnly") {
    const latlon = formatGeorisquesPoint(context.lon, context.lat);
    if (!latlon) {
      throw new Error("Coordonnées latitude / longitude indisponibles pour cette requête Géorisques.");
    }
    url.searchParams.set("latlon", latlon);
    return url.toString();
  }

  if (queryMode === "latlonOrCodeInsee") {
    if (codeInsee) {
      url.searchParams.set("code_insee", codeInsee);
      return url.toString();
    }

    const latlon = formatGeorisquesPoint(context.lon, context.lat);
    if (!latlon) {
      throw new Error("Coordonnées latitude / longitude indisponibles pour cette requête Géorisques.");
    }
    url.searchParams.set("latlon", latlon);
    return url.toString();
  }

  if (queryMode === "radiusLatlonOrCodeInsee") {
    url.searchParams.set("rayon", String(context.radius || GEORISQUES_POINT_RADIUS_METERS));

    if (codeInsee) {
      url.searchParams.set("code_insee", codeInsee);
    } else {
      const latlon = formatGeorisquesPoint(context.lon, context.lat);
      if (!latlon) {
        throw new Error("Coordonnées latitude / longitude indisponibles pour cette requête Géorisques.");
      }
      url.searchParams.set("latlon", latlon);
    }

    url.searchParams.set("page", "1");
    url.searchParams.set("page_size", "10");
    return url.toString();
  }

  url.searchParams.set("code_insee", codeInsee);
  return url.toString();
}

async function fetchFirstAvailableEndpoint(context, endpoint) {
  const attempts = [];

  for (const path of endpoint.paths) {
    let url = "";

    try {
      url = buildEndpointUrl(path, {
        codeInsee: context?.codeInsee,
        lat: context?.lat,
        lon: context?.lon,
        radius: context?.radius,
        queryMode: endpoint?.queryMode || "codeInsee"
      });

      const data = await fetchJson(url);
      return {
        key: endpoint.key,
        label: endpoint.label,
        status: "success",
        url,
        data,
        attempts
      };
    } catch (error) {
      attempts.push({
        url,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    key: endpoint.key,
    label: endpoint.label,
    status: "error",
    url: attempts[0]?.url || "",
    data: null,
    attempts,
    error: attempts[attempts.length - 1]?.error || "Requête impossible"
  };
}

async function resolveCommune(city, postalCode) {
  const safeCity = safeString(city);
  const safePostalCode = safeString(postalCode);

  if (!safeCity || !safePostalCode) {
    throw new Error("Ville et code postal requis.");
  }

  const url = `${COMMUNES_API_URL}?codePostal=${encodeURIComponent(safePostalCode)}&nom=${encodeURIComponent(safeCity)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,centre&boost=population&limit=10`;
  const results = await fetchJson(url);
  const items = Array.isArray(results) ? results : [];

  if (!items.length) {
    throw new Error("Aucune commune correspondante trouvée.");
  }

  const normalizedCity = normalizeString(safeCity);
  const exact = items.find((item) => normalizeString(item?.nom) === normalizedCity) || null;
  const matchingPostalCode = items.find((item) => Array.isArray(item?.codesPostaux) && item.codesPostaux.includes(safePostalCode)) || null;
  const best = exact || matchingPostalCode || items[0];
  const centreCoords = toCoordsFromGeometry(best?.centre);

  return {
    name: safeString(best?.nom),
    codeInsee: safeString(best?.code),
    postalCodes: Array.isArray(best?.codesPostaux) ? best.codesPostaux : [],
    departmentCode: safeString(best?.codeDepartement),
    regionCode: safeString(best?.codeRegion),
    population: best?.population ?? null,
    lat: centreCoords.lat,
    lon: centreCoords.lon,
    sourceUrl: url
  };
}

function mapMunicipalityFeature(feature, sourceUrl = "") {
  const properties = feature?.properties || {};
  const coords = toCoordsFromGeometry(feature?.geometry);
  const city = safeString(properties.city || properties.name || properties.label);
  const postalCode = safeString(properties.postcode || properties.postcode_local || "");

  return {
    label: safeString(properties.label || [city, postalCode].filter(Boolean).join(" ")),
    name: city,
    postalCode,
    postalCodes: postalCode ? [postalCode] : [],
    codeInsee: safeString(properties.citycode || properties.code || ""),
    departmentCode: safeString(properties.context || "").split(",")[0]?.trim() || "",
    lat: coords.lat,
    lon: coords.lon,
    sourceUrl
  };
}

export async function searchFrenchCommunes({ query = "", postalCode = "", limit = 6 } = {}) {
  const safeQuery = safeString(query);
  const safePostalCode = safeString(postalCode);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 2) return [];

  const searchParams = new URLSearchParams({
    q: safePostalCode ? `${safeQuery} ${safePostalCode}` : safeQuery,
    type: "municipality",
    limit: String(safeLimit)
  });

  const url = `${ADDRESS_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const features = Array.isArray(results?.features) ? results.features : [];

  return features
    .map((feature) => mapMunicipalityFeature(feature, url))
    .filter((item) => item.name)
    .sort((a, b) => {
      const exactA = normalizeString(a.name) === normalizeString(safeQuery) ? 1 : 0;
      const exactB = normalizeString(b.name) === normalizeString(safeQuery) ? 1 : 0;
      return exactB - exactA;
    });
}

export async function searchFrenchPostalCodes({ query = "", limit = 6 } = {}) {
  const safeQuery = safeString(query).replace(/\D+/g, "");
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 2) return [];

  const searchParams = new URLSearchParams({
    q: safeQuery,
    type: "municipality",
    limit: String(safeLimit)
  });

  const url = `${ADDRESS_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const features = Array.isArray(results?.features) ? results.features : [];

  return features
    .map((feature) => mapMunicipalityFeature(feature, url))
    .filter((item) => item.postalCode && item.postalCode.startsWith(safeQuery));
}

function getIgnCompletionItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.completions)) return payload.completions;
  if (Array.isArray(payload?.suggestions)) return payload.suggestions;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function mapIgnCompletionItem(item, sourceUrl = "") {
  const properties = item?.properties || {};
  const label = safeString(
    item?.fulltext ||
    item?.label ||
    item?.text ||
    properties?.fulltext ||
    properties?.label ||
    properties?.name ||
    item?.name
  );

  return {
    label,
    kind: safeString(item?.type || properties?.type || item?.kind || properties?.kind),
    sourceUrl,
    raw: item
  };
}

export async function searchIgnAddresses({ query = "", limit = 6 } = {}) {
  const safeQuery = safeString(query);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 3) return [];

  const searchParams = new URLSearchParams({
    text: safeQuery,
    type: "StreetAddress",
    maximumResponses: String(safeLimit),
    terr: "METROPOLE"
  });

  const url = `${IGN_COMPLETION_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);

  return getIgnCompletionItems(results)
    .map((item) => mapIgnCompletionItem(item, url))
    .filter((item) => item.label);
}

export async function resolveFrenchAddress(query = "") {
  const safeQuery = safeString(query);

  if (!safeQuery) {
    throw new Error("Adresse requise.");
  }

  const searchParams = new URLSearchParams({
    q: safeQuery,
    limit: "1"
  });

  const url = `${ADDRESS_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const feature = Array.isArray(results?.features) ? results.features[0] : null;

  if (!feature) {
    throw new Error("Adresse introuvable.");
  }

  const properties = feature.properties || {};
  const coords = toCoordsFromGeometry(feature.geometry);

  return {
    address: safeString(properties.label || safeQuery),
    city: safeString(properties.city),
    postalCode: safeString(properties.postcode),
    codeInsee: safeString(properties.citycode),
    lat: coords.lat,
    lon: coords.lon,
    sourceUrl: url
  };
}

/**
 * Le centre d'une commune, d'après son code INSEE.
 *
 * ## À quoi il sert
 *
 * À **regarder** une commune dont on n'a pas le point. Un projet enregistré
 * avant que la localisation ne porte ses coordonnées n'a qu'une adresse et un
 * code INSEE ; la carte n'avait alors rien à centrer, et l'écran restait noir —
 * alors qu'on sait parfaitement où est la commune.
 *
 * ## Ce qu'il n'est pas
 *
 * Ce n'est **pas** le projet. Le centre d'une commune est un point de
 * commodité — souvent le chef-lieu, parfois un champ —, et l'écrire comme
 * localisation ferait entrer en mémoire un endroit que personne n'a désigné
 * (règle 5). Il sert à poser le regard, et le marqueur reste absent tant que
 * quelqu'un n'a pas dit où était le terrain.
 *
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
export async function centreDeLaCommune(codeInsee = "") {
  const code = safeString(codeInsee);
  if (!code) return null;

  try {
    const url = `${COMMUNES_API_URL}/${encodeURIComponent(code)}?fields=centre&format=json`;
    const commune = await fetchJson(url);
    const coords = toCoordsFromGeometry(commune?.centre);
    return Number.isFinite(coords?.lat) && Number.isFinite(coords?.lon)
      ? { latitude: coords.lat, longitude: coords.lon }
      : null;
  } catch {
    // Une carte qu'on ne sait pas centrer n'est pas une panne : l'écran s'en
    // passe, et le reste du calcul ne dépend pas d'elle.
    return null;
  }
}

/**
 * La commune d'un point, à l'envers : des coordonnées vers un code INSEE.
 *
 * ## Pourquoi il fallait ce sens-là
 *
 * Un projet qui n'est pas construit n'a pas d'adresse. Il est dans un champ, et
 * la seule chose qui le situe est le point qu'on est allé chercher sur une vue
 * satellite. Sans cet appel, ce projet-là n'avait **pas de code INSEE** — et
 * sans code INSEE, aucune table de zonage ne se lit : il n'aurait eu ni neige,
 * ni vent, ni cote hors gel.
 *
 * ## Pourquoi la base des communes, et non celle des adresses
 *
 * Le premier essai interrogeait le service d'**adresses** à l'envers. Il rend
 * l'adresse la plus proche — et au milieu d'un champ, il n'y en a aucune dans
 * son rayon de recherche : il répondait donc « aucune commune trouvée à cet
 * endroit », ce qui est faux partout sauf en mer. C'était le cas d'usage même
 * pour lequel cet appel existe.
 *
 * La base des communes, elle, répond par **découpage administratif** : tout
 * point de terre française tombe dans une commune, et il n'y en a qu'une. Elle
 * ne rend pas d'adresse, et c'est très bien : la maison d'à côté n'est pas le
 * projet, et l'écrire reviendrait à inventer un fait que personne n'a constaté
 * (règle 5).
 */
export async function resolveFrenchCoordinates({ latitude = null, longitude = null } = {}) {
  const lat = toNumber(latitude);
  const lon = toNumber(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Coordonnées latitude / longitude requises.");
  }

  const searchParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    fields: "nom,code,codesPostaux",
    format: "json"
  });

  const url = `${COMMUNES_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const commune = Array.isArray(results) ? results[0] : null;

  if (!commune) {
    // Hors de France, ou en mer. Le dire ainsi plutôt que « aucune commune
    // trouvée » : la phrase précédente laissait croire à une panne du service.
    throw new Error("Ce point n'est dans aucune commune française.");
  }

  return {
    // Vide, et non l'adresse voisine : le projet n'en a pas, et lui en prêter
    // une ferait entrer en mémoire un fait que personne n'a constaté.
    address: "",
    city: safeString(commune?.nom),
    postalCode: safeString(commune?.codesPostaux?.[0]),
    codeInsee: safeString(commune?.code),
    lat,
    lon,
    sourceUrl: url
  };
}

export async function resolveFrenchCommune({ city = "", postalCode = "" } = {}) {
  const commune = await resolveCommune(city, postalCode);
  return {
    city: commune.name,
    postalCode: commune.postalCodes?.[0] || safeString(postalCode),
    codeInsee: commune.codeInsee,
    lat: commune.lat,
    lon: commune.lon,
    sourceUrl: commune.sourceUrl
  };
}

export async function resolveFrenchPostalCode(postalCode = "") {
  const safePostalCode = safeString(postalCode).replace(/\D+/g, "");

  if (safePostalCode.length < 5) {
    throw new Error("Code postal requis.");
  }

  const url = `${COMMUNES_API_URL}?codePostal=${encodeURIComponent(safePostalCode)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,centre&boost=population&limit=10`;
  const results = await fetchJson(url);
  const items = Array.isArray(results) ? results : [];
  const best = items[0] || null;

  if (!best) {
    throw new Error("Aucune commune correspondante trouvée.");
  }

  const centreCoords = toCoordsFromGeometry(best?.centre);

  return {
    city: safeString(best?.nom),
    postalCode: safePostalCode,
    codeInsee: safeString(best?.code),
    lat: centreCoords.lat,
    lon: centreCoords.lon,
    sourceUrl: url
  };
}

export async function fetchFrenchAltitude({ longitude = null, latitude = null } = {}) {
  const lon = toNumber(longitude);
  const lat = toNumber(latitude);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error("Coordonnées latitude / longitude requises pour l'altitude.");
  }

  const url = new URL(IGN_ELEVATION_API_URL);
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("resource", "ign_rge_alti_wld");
  url.searchParams.set("delimiter", "|");
  url.searchParams.set("indent", "true");
  url.searchParams.set("measures", "false");
  url.searchParams.set("zonly", "true");

  const data = await fetchJson(url.toString());
  const elevations = Array.isArray(data?.elevations) ? data.elevations : [];
  const value = toNumber(elevations[0]);

  if (!Number.isFinite(value)) {
    throw new Error("Altitude introuvable pour ces coordonnées.");
  }

  return {
    altitude: value,
    sourceUrl: url.toString(),
    raw: data
  };
}

/**
 * Les deux jeux qu'on **conserve**, redemandés pour un code INSEE et un point.
 *
 * ## Pourquoi une seconde interrogation, plus courte
 *
 * `fetchGeorisquesForCommune` sert l'écran : quinze jeux, pour regarder. Le
 * rejeu n'en a besoin que de deux — ceux dont la maille correspond à ce qu'on
 * affirme —, et redemander les treize autres ferait treize allers-retours pour
 * rien à chaque variante essayée.
 *
 * ## Pourquoi le code INSEE, et non la commune et son code postal
 *
 * Parce qu'on l'a. Une variante de localisation porte le code INSEE de la
 * commune essayée ; repasser par « nom + code postal » demanderait de résoudre
 * une commune qui est déjà résolue, et deux communes homonymes rendraient un
 * jour la mauvaise.
 *
 * Le point, lui, peut manquer : un projet sans coordonnées garde sa zone
 * sismique — elle est communale — et n'a pas d'exposition argileuse, parce
 * qu'on ne sait pas où il est dans sa commune (règle 5). L'appelant demande
 * alors le seul jeu qu'il peut demander, et ce qui manque se dit au lieu de
 * partir au large du golfe de Guinée.
 *
 * @returns {Promise<object>} la même forme que `fetchGeorisquesForCommune`, si
 *   bien que `contextFactsFromGeorisques` la lit sans rien savoir d'ici
 */
export async function fetchGeorisquesRetenus({
  jeux = [], codeInsee = "", commune = "", latitude = null, longitude = null
} = {}) {
  const voulus = new Set((Array.isArray(jeux) ? jeux : []).map(safeString).filter(Boolean));
  const code = safeString(codeInsee);
  const lat = toNumber(latitude);
  const lon = toNumber(longitude);

  const demandes = GEORISQUES_COMMUNE_ENDPOINTS.filter((endpoint) => voulus.has(endpoint.key));
  if (!demandes.length) throw new Error("Aucun jeu Géorisques demandé.");

  // Ce qu'il faut pour demander, et qui n'est pas le même selon la maille : le
  // zonage sismique se lit par la commune, l'aléa argileux par le point.
  if (demandes.some((endpoint) => endpoint.queryMode !== "latlonOnly") && !code) {
    throw new Error("Le code INSEE de la commune est requis.");
  }
  if (demandes.some((endpoint) => endpoint.queryMode === "latlonOnly")
    && !(Number.isFinite(lat) && Number.isFinite(lon))) {
    throw new Error("Coordonnées latitude / longitude requises pour cet aléa.");
  }

  const datasets = await Promise.all(demandes.map((endpoint) => fetchFirstAvailableEndpoint({
    codeInsee: code,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    radius: GEORISQUES_POINT_RADIUS_METERS
  }, endpoint)));

  return {
    query: { codeInsee: code },
    commune: {
      codeInsee: code,
      name: safeString(commune),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null
    },
    requestedAt: new Date().toISOString(),
    datasets
  };
}

export async function fetchGeorisquesForCommune({ city = "", postalCode = "", latitude = null, longitude = null } = {}) {
  const commune = await resolveCommune(city, postalCode);

  if (!commune.codeInsee) {
    throw new Error("Le code INSEE de la commune n'a pas pu être déterminé.");
  }

  const datasets = await Promise.all(
    GEORISQUES_COMMUNE_ENDPOINTS.map((endpoint) => fetchFirstAvailableEndpoint({
      codeInsee: commune.codeInsee,
      lat: toNumber(latitude) ?? commune.lat,
      lon: toNumber(longitude) ?? commune.lon,
      radius: GEORISQUES_POINT_RADIUS_METERS
    }, endpoint))
  );

  return {
    query: {
      city: safeString(city),
      postalCode: safeString(postalCode)
    },
    commune,
    requestedAt: new Date().toISOString(),
    datasets
  };
}
