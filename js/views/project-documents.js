export function renderProjectDocuments(root) {
  root.innerHTML = `
    <h2>Documents</h2>
    <div class="form-row">
      <label>PDF étude</label>
      <input id="pdfFile" type="file" accept="application/pdf">
    </div>
  `;
}
