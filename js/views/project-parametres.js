import { store } from "../store.js";
import { renderDoctrinePage } from "./project-doctrine-page.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function getTopHtml(form) {
  return `
    <section class="settings-section settings-section--top" id="parametres-general">
      <h3>General</h3>
      <p class="settings-lead">On conserve en haut les inputs actuels pour ne pas casser le fonctionnement de l'application. Cet onglet devient toutefois la page Paramètres du projet au sens GitHub-like : données structurantes, référentiels, rôles, taxonomies et règles de gouvernance.</p>

      <div class="settings-card settings-card--form">
        <div class="settings-card__head">
          <div>
            <h4>Inputs existants conservés</h4>
            <p>Ces champs restent branchés au store actuel et constituent la première brique des paramètres projet.</p>
          </div>
          <span class="settings-badge mono">LIVE</span>
        </div>

        <div class="settings-form-grid">
          <div class="form-row form-row--settings">
            <label>Commune / Code postal</label>
            <input id="communeCp" type="text" value="${escapeHtml(form.communeCp || "")}">
          </div>

          <div class="form-row form-row--settings">
            <label>Classe d'importance</label>
            <select id="importance">
              <option value="I" ${form.importance === "I" ? "selected" : ""}>I</option>
              <option value="II" ${form.importance === "II" ? "selected" : ""}>II</option>
              <option value="III" ${form.importance === "III" ? "selected" : ""}>III</option>
              <option value="IV" ${form.importance === "IV" ? "selected" : ""}>IV</option>
            </select>
          </div>

          <div class="form-row form-row--settings">
            <label>Classe de sol</label>
            <select id="soilClass">
              <option value="A" ${form.soilClass === "A" ? "selected" : ""}>A</option>
              <option value="B" ${form.soilClass === "B" ? "selected" : ""}>B</option>
              <option value="C" ${form.soilClass === "C" ? "selected" : ""}>C</option>
              <option value="D" ${form.soilClass === "D" ? "selected" : ""}>D</option>
              <option value="E" ${form.soilClass === "E" ? "selected" : ""}>E</option>
            </select>
          </div>

          <div class="form-row form-row--settings">
            <label>Liquéfaction</label>
            <select id="liquefaction">
              <option value="no" ${form.liquefaction === "no" ? "selected" : ""}>Non</option>
              <option value="possible" ${form.liquefaction === "possible" ? "selected" : ""}>Possible</option>
              <option value="yes" ${form.liquefaction === "yes" ? "selected" : ""}>Oui</option>
            </select>
          </div>

          <div class="form-row form-row--settings">
            <label>Référentiel</label>
            <select id="referential">
              <option value="EC8" ${form.referential === "EC8" ? "selected" : ""}>Eurocode 8</option>
              <option value="PS92" ${form.referential === "PS92" ? "selected" : ""}>PS92</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderProjectParametres(root) {
  const form = store.projectForm;

  renderDoctrinePage(root, {
    contextLabel: "Paramètres",
    variant: "parametres",
    scrollId: "projectParametresScroll",
    navTitle: "Paramètres",
    pageTitle: "General",
    pageIntro: "La page reprend l'esprit Settings de GitHub. On y configure les données de base du projet, les référentiels applicables, les circuits de validation, la taxonomie de classement et les règles qui gouvernent les autres onglets.",
    topHtml: getTopHtml(form),
    navItems: [
      { id: "parametres-general", label: "General" },
      { id: "parametres-acces", label: "Accès" },
      { id: "parametres-branches", label: "Flux documentaire" },
      { id: "parametres-rules", label: "Rules" },
      { id: "parametres-integrations", label: "Intégrations" }
    ],
    sections: [
      {
        id: "parametres-acces",
        title: "Access",
        lead: "Ici seront définis les rôles et les capacités des contributeurs : qui peut ouvrir un sujet, déposer une proposition, approuver, rejeter, diffuser ou simplement consulter.",
        blocks: [
          {
            title: "Collaborateurs projet",
            description: "La page affichera les profils et responsabilités des acteurs du projet.",
            items: [
              "MOA, MOE, architecte, BET, CT, SPS, OPC, entreprises, exploitant.",
              "Périmètre d'écriture, de validation et de diffusion par rôle.",
              "Règles particulières pour les pièces sensibles ou validations critiques.",
              "Historique des changements de droits."
            ],
            actions: [
              { label: "Ajouter un contributeur" },
              { label: "Configurer les droits" }
            ]
          }
        ]
      },
      {
        id: "parametres-branches",
        title: "Code and automation",
        lead: "Ce bloc adapte la logique branches / actions / webhooks à la construction. La branche de référence devient la définition documentaire en vigueur, et les flux automatiques gèrent la diffusion et les contrôles procéduraux.",
        blocks: [
          {
            title: "Définition de référence",
            description: "Elle matérialise ce qui fait foi sur le projet.",
            badge: "MAIN",
            items: [
              "Nom de la définition en vigueur du projet.",
              "Politique d'intégration : aucune mise à jour directe hors proposition approuvée.",
              "Historisation systématique des remplacements.",
              "Règles de diffusion après intégration."
            ],
            actions: [
              { label: "Renommer la référence" },
              { label: "Configurer intégration" }
            ]
          },
          {
            title: "Automatisation",
            description: "Cette carte expliquera quels workflows sont disponibles et comment ils s'enchaînent avec les validations humaines.",
            items: [
              "Checks obligatoires avant intégration.",
              "Notifications et bordereaux automatiques.",
              "Déclenchement de revues par discipline.",
              "Journal des exécutions."
            ],
            actions: [
              { label: "Voir workflows" },
              { label: "Configurer notifications" }
            ]
          }
        ]
      },
      {
        id: "parametres-rules",
        title: "Rules",
        lead: "Ces paramètres gouvernent la qualité des flux : champs obligatoires, revues minimales, critères de clôture et taxonomies communes.",
        blocks: [
          {
            title: "Règles de gestion",
            description: "Ce seront les garde-fous transverses du projet.",
            items: [
              "Champs obligatoires pour un sujet ou une proposition.",
              "Nombre et type de validations requises selon le changement.",
              "Taxonomie des disciplines, zones, lots et criticités.",
              "Conditions de clôture d'un sujet et preuves attendues."
            ],
            actions: [
              { label: "Configurer les règles" },
              { label: "Éditer la taxonomie" }
            ]
          }
        ]
      },
      {
        id: "parametres-integrations",
        title: "Integrations",
        lead: "Cette zone expliquera comment l'application se connectera aux outils externes : GED, maquette, n8n, Supabase, mails, exports ou autres systèmes métiers.",
        blocks: [
          {
            title: "Connecteurs projet",
            description: "La vue restera descriptive mais permettra de comprendre la future architecture d'intégration.",
            items: [
              "Webhooks et automatisations n8n.",
              "Sources documentaires externes ou GED.",
              "Exports de revues, bordereaux, rapports et indicateurs.",
              "Journal des événements envoyés aux systèmes tiers."
            ],
            actions: [
              { label: "Voir connecteurs" },
              { label: "Journal des événements" }
            ]
          }
        ]
      }
    ]
  });

  bindIdentityEvents();
}

function bindIdentityEvents() {
  const communeCp = document.getElementById("communeCp");
  const importance = document.getElementById("importance");
  const soilClass = document.getElementById("soilClass");
  const liquefaction = document.getElementById("liquefaction");
  const referential = document.getElementById("referential");

  if (communeCp) {
    communeCp.addEventListener("input", (e) => {
      store.projectForm.communeCp = e.target.value;
    });
  }

  if (importance) {
    importance.addEventListener("change", (e) => {
      store.projectForm.importance = e.target.value;
    });
  }

  if (soilClass) {
    soilClass.addEventListener("change", (e) => {
      store.projectForm.soilClass = e.target.value;
    });
  }

  if (liquefaction) {
    liquefaction.addEventListener("change", (e) => {
      store.projectForm.liquefaction = e.target.value;
    });
  }

  if (referential) {
    referential.addEventListener("change", (e) => {
      store.projectForm.referential = e.target.value;
    });
  }
}
