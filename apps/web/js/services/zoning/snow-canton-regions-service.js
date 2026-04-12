import { getSnowRegionsByDepartmentCode } from "./snow-regions-service.js";

let snowCantonRegionsPromise = null;

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

async function loadSnowCantonRegions() {
  if (!snowCantonRegionsPromise) {
    const url = new URL('./snow-canton-regions.json', import.meta.url);
    snowCantonRegionsPromise = fetch(url)
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

          const department = await getSnowRegionsByDepartmentCode(normalizedCode);
          return {
            departmentCode: normalizedCode,
            departmentName: department?.departmentName || "",
            zoneRows: (Array.isArray(zoneRows) ? zoneRows : []).map((zoneRow) => {
              const [snowRegion, cantons] = Array.isArray(zoneRow) ? zoneRow : [];
              const cantonList = Array.isArray(cantons)
                ? cantons.map((value) => String(value || "").trim()).filter(Boolean)
                : [];
              return {
                snowRegion: String(snowRegion ?? "").trim(),
                cantons: cantonList,
                normalizedCantons: cantonList.map(normalizeCantonName).filter(Boolean)
              };
            }).filter((zoneRow) => zoneRow.snowRegion)
          };
        }));

        return mappedRows.filter(Boolean);
      });
  }

  return snowCantonRegionsPromise;
}

export async function getSnowZoneByDepartmentAndCanton(departmentCode = '', cantonName = '') {
  const department = await getSnowRegionsByDepartmentCode(departmentCode);
  if (!department) {
    return null;
  }

  if (Array.isArray(department.snowRegions) && department.snowRegions.length === 1) {
    return {
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      snowZone: department.snowRegions[0],
      matchType: 'single_department_zone'
    };
  }

  const normalizedDepartmentCode = normalizeDepartmentCode(departmentCode);
  const normalizedCanton = normalizeCantonName(cantonName);
  const rows = await loadSnowCantonRegions();
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
      snowZone: explicitMatch.snowRegion,
      matchType: 'explicit_canton_match'
    };
  }

  const fallbackRow = departmentRows.zoneRows.find((zoneRow) => isFallbackCantonsRow(zoneRow.cantons));
  if (fallbackRow) {
    return {
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      snowZone: fallbackRow.snowRegion,
      matchType: 'fallback_other_cantons'
    };
  }

  return null;
}

export async function getAllSnowCantonRegions() {
  return loadSnowCantonRegions();
}
