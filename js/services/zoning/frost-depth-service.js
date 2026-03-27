let frostDepthDepartmentsPromise = null;

function normalizeDepartmentCode(value = "") {
  return String(value ?? "").trim().toUpperCase();
}

async function loadFrostDepthDepartmentsIndex() {
  if (!frostDepthDepartmentsPromise) {
    const url = new URL('./frost-depth-departments.json', import.meta.url);
    frostDepthDepartmentsPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((rows) => {
        const index = new Map();

        (Array.isArray(rows) ? rows : []).forEach((row) => {
          const [departmentCode, departmentName, h0Values] = Array.isArray(row) ? row : [];
          const normalizedCode = normalizeDepartmentCode(departmentCode);
          if (!normalizedCode) return;

          index.set(normalizedCode, {
            departmentCode: normalizedCode,
            departmentName: String(departmentName || '').trim(),
            h0Values: Array.isArray(h0Values)
              ? h0Values.map((value) => String(value ?? '').trim()).filter(Boolean)
              : []
          });
        });

        return index;
      });
  }

  return frostDepthDepartmentsPromise;
}

export async function getFrostDepthByDepartmentCode(departmentCode = '') {
  const normalizedCode = normalizeDepartmentCode(departmentCode);
  if (!normalizedCode) return null;

  const index = await loadFrostDepthDepartmentsIndex();
  return index.get(normalizedCode) || null;
}

export async function getAllFrostDepthDepartments() {
  const index = await loadFrostDepthDepartmentsIndex();
  return Array.from(index.values());
}
