let windRegionsIndexPromise = null;

function normalizeDepartmentCode(value = "") {
  return String(value ?? "").trim().toUpperCase();
}

async function loadWindRegionsIndex() {
  if (!windRegionsIndexPromise) {
    const url = new URL('./wind-regions-departments.json', import.meta.url);
    windRegionsIndexPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((rows) => {
        const index = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
          const [departmentCode, departmentName, windRegions] = Array.isArray(row) ? row : [];
          const key = normalizeDepartmentCode(departmentCode);
          if (!key) return;
          index.set(key, {
            departmentCode: key,
            departmentName: String(departmentName || '').trim(),
            windRegions: Array.isArray(windRegions) ? windRegions.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value)) : []
          });
        });
        return index;
      });
  }

  return windRegionsIndexPromise;
}

export async function getWindRegionsByDepartmentCode(departmentCode = '') {
  const key = normalizeDepartmentCode(departmentCode);
  if (!key) {
    return null;
  }

  const index = await loadWindRegionsIndex();
  return index.get(key) || null;
}

export async function getAllWindRegionsDepartments() {
  const index = await loadWindRegionsIndex();
  return Array.from(index.values());
}
