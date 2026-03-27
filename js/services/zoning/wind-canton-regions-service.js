import { getWindRegionsByDepartmentCode } from "./wind-regions-service.js";

let windCantonRegionsPromise = null;

function normalizeDepartmentCode(value = "") {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeCantonName(value = "") {
  return String(value ?? "")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[-/]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\bsainte\b/g, 'ste')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFallbackCantonsRow(cantons = []) {
  return cantons.some((canton) => normalizeCantonName(canton) === 'tous les autres cantons');
}

async function loadWindCantonRegions() {
  if (!windCantonRegionsPromise) {
    const url = new URL('./wind-canton-regions.json', import.meta.url);
    windCantonRegionsPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(async (rows) => {
        const mappedRows = await Promise.all((Array.isArray(rows) ? rows : []).map(async (row) => {
          const [departmentCode, zoneRows] = Array.isArray(row) ? row : [];
          const normalizedCode = normalizeDepartmentCode(departmentCode);
          if (!normalizedCode) return null;

          const department = await getWindRegionsByDepartmentCode(normalizedCode);
          return {
            departmentCode: normalizedCode,
            departmentName: department?.departmentName || "",
            zoneRows: (Array.isArray(zoneRows) ? zoneRows : []).map((zoneRow) => {
              const [windRegion, cantons] = Array.isArray(zoneRow) ? zoneRow : [];
              const cantonList = Array.isArray(cantons)
                ? cantons.map((value) => String(value || "").trim()).filter(Boolean)
                : [];
              return {
                windRegion: String(windRegion ?? "").trim(),
                cantons: cantonList,
                normalizedCantons: cantonList.map(normalizeCantonName).filter(Boolean)
              };
            }).filter((zoneRow) => zoneRow.windRegion)
          };
        }));

        return mappedRows.filter(Boolean);
      });
  }

  return windCantonRegionsPromise;
}

export async function getWindZoneByDepartmentAndCanton(departmentCode = '', cantonName = '') {
  const department = await getWindRegionsByDepartmentCode(departmentCode);
  if (!department) {
    return null;
  }

  if (Array.isArray(department.windRegions) && department.windRegions.length === 1) {
    return {
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      windZone: department.windRegions[0],
      matchType: 'single_department_zone'
    };
  }

  const normalizedDepartmentCode = normalizeDepartmentCode(departmentCode);
  const normalizedCanton = normalizeCantonName(cantonName);
  const rows = await loadWindCantonRegions();
  const departmentRows = rows.find((row) => row.departmentCode === normalizedDepartmentCode);
  if (!departmentRows) {
    return null;
  }

  const explicitMatch = departmentRows.zoneRows.find((zoneRow) => (
    !isFallbackCantonsRow(zoneRow.cantons) && zoneRow.normalizedCantons.includes(normalizedCanton)
  ));

  if (explicitMatch) {
    return {
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      windZone: explicitMatch.windRegion,
      matchType: 'explicit_canton_match'
    };
  }

  const fallbackRow = departmentRows.zoneRows.find((zoneRow) => isFallbackCantonsRow(zoneRow.cantons));
  if (fallbackRow) {
    return {
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      windZone: fallbackRow.windRegion,
      matchType: 'fallback_other_cantons'
    };
  }

  return null;
}
