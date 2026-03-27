let snowRegionsIndexPromise = null;

function normalizeDepartmentCode(value = "") {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeSnowRegion(value = "") {
  return String(value ?? "").trim().toUpperCase();
}

async function loadSnowRegionsIndex() {
  if (!snowRegionsIndexPromise) {
    const url = new URL('./snow-regions-departments.json', import.meta.url);
    snowRegionsIndexPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((rows) => {
        const index = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
          const [departmentCode, departmentName, snowRegions] = Array.isArray(row) ? row : [];
          const key = normalizeDepartmentCode(departmentCode);
          if (!key) return;
          index.set(key, {
            departmentCode: key,
            departmentName: String(departmentName || '').trim(),
            snowRegions: Array.isArray(snowRegions)
              ? snowRegions.map((value) => normalizeSnowRegion(value)).filter(Boolean)
              : []
          });
        });
        return index;
      });
  }

  return snowRegionsIndexPromise;
}

export async function getSnowRegionsByDepartmentCode(departmentCode = '') {
  const key = normalizeDepartmentCode(departmentCode);
  if (!key) {
    return null;
  }

  const index = await loadSnowRegionsIndex();
  return index.get(key) || null;
}

export async function getAllSnowRegionsDepartments() {
  const index = await loadSnowRegionsIndex();
  return Array.from(index.values());
}
