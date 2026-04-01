const COMMUNE_CANTON_2014_MAP_URL = new URL("./commune-canton-2014-map.json", import.meta.url);
const CANTON_2014_NAMES_MAP_URL = new URL("./canton-2014-names-map.json", import.meta.url);
const CANTON_NAMES_MAP_URL = new URL("./canton-names-map.json", import.meta.url);

let communeToCanton2014Promise = null;
let canton2014NamesPromise = null;
let cantonNamesPromise = null;

function safeString(value = "") {
  return String(value ?? "").trim();
}

async function loadJsonMap(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Impossible de charger ${url.pathname} (HTTP ${response.status}).`);
  }

  return response.json();
}

function loadCommuneToCanton2014Map() {
  if (!communeToCanton2014Promise) {
    communeToCanton2014Promise = loadJsonMap(COMMUNE_CANTON_2014_MAP_URL);
  }
  return communeToCanton2014Promise;
}

function loadCanton2014NamesMap() {
  if (!canton2014NamesPromise) {
    canton2014NamesPromise = loadJsonMap(CANTON_2014_NAMES_MAP_URL);
  }
  return canton2014NamesPromise;
}

function loadCantonNamesMap() {
  if (!cantonNamesPromise) {
    cantonNamesPromise = loadJsonMap(CANTON_NAMES_MAP_URL);
  }
  return cantonNamesPromise;
}

export async function getCantonByCommuneCode(inseeCode = "") {
  const normalizedInseeCode = safeString(inseeCode);

  if (!normalizedInseeCode) {
    return null;
  }

  const [communeToCanton2014Map, canton2014NamesMap, cantonNamesMap] = await Promise.all([
    loadCommuneToCanton2014Map(),
    loadCanton2014NamesMap(),
    loadCantonNamesMap()
  ]);

  const cantonCode = safeString(communeToCanton2014Map?.[normalizedInseeCode]);
  if (!cantonCode) {
    return null;
  }

  const cantonName2014 = safeString(canton2014NamesMap?.[cantonCode]);
  const cantonNameCurrent = safeString(cantonNamesMap?.[cantonCode]);
  const cantonName = cantonName2014 || cantonNameCurrent;

  return {
    inseeCode: normalizedInseeCode,
    cantonCode,
    cantonName,
    cantonName2014,
    cantonNameCurrent
  };
}
