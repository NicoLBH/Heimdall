export function renderProjectsList(root) {
  root.innerHTML = `
    <div class="page">
      <h1>Projets</h1>

      <table class="projects-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Client</th>
            <th>Ville</th>
            <th>Statut</th>
            <th>Pilote</th>
          </tr>
        </thead>
        <tbody>

          <tr onclick="location.hash='#project/1/dashboard'">
            <td>Immeuble Horizon</td>
            <td>Nexity</td>
            <td>Lyon</td>
            <td>En cours</td>
            <td>Dupont</td>
          </tr>

          <tr onclick="location.hash='#project/2/dashboard'">
            <td>Tour Atlas</td>
            <td>Bouygues</td>
            <td>Paris</td>
            <td>Analyse</td>
            <td>Martin</td>
          </tr>

        </tbody>
      </table>
    </div>
  `;
}
