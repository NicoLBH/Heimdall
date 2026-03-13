import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectWorkflows(root) {
  renderDoctrinePage(root, {
    contextLabel: "Workflows",
    variant: "workflows",
    scrollId: "projectWorkflowsScroll",
    navTitle: "Workflows",
    pageTitle: "Workflows",
    pageIntro: "Cet onglet transpose GitHub Actions au projet de construction. Il montrera les procédures automatisées qui orchestrent les enchaînements, sans jamais remplacer la décision technique ou réglementaire humaine.",
    navItems: [
      { id: "workflows-bibliotheque", label: "Bibliothèque" },
      { id: "workflows-runs", label: "Exécutions" },
      { id: "workflows-approbations", label: "Approbations" },
      { id: "workflows-checks", label: "Checks" }
    ],
    sections: [
      {
        id: "workflows-bibliotheque",
        title: "Bibliothèque de workflows",
        lead: "La page affichera les automatismes disponibles pour le projet : diffusion, mise à jour de statuts, notifications, contrôles de complétude et déclenchement de revues ciblées.",
        blocks: [
          {
            title: "Exemples de workflows affichés",
            description: "Chaque ligne décrira le déclencheur, les prérequis et l'effet métier attendu.",
            items: [
              "Après approbation d'une proposition : intégrer la pièce, historiser l'ancienne version, notifier les intervenants.",
              "Avant jalon : alerter si des sujets bloquants restent ouverts.",
              "Sur changement de produit sensible : demander une revue sécurité/réglementaire complémentaire.",
              "Après clôture de sujet : vérifier qu'une preuve est bien associée."
            ],
            actions: [
              { label: "Nouveau workflow" },
              { label: "Voir déclencheurs" }
            ]
          }
        ]
      },
      {
        id: "workflows-runs",
        title: "Exécutions et journal",
        lead: "Comme dans GitHub Actions, l'utilisateur verra les runs, leur statut, leur date, leurs sorties et les éventuels blocages humains.",
        blocks: [
          {
            title: "Colonnes prévues",
            description: "Cette table servira de journal opératoire du projet.",
            badge: "RUNS",
            items: [
              "Nom du workflow exécuté.",
              "Déclencheur : proposition, sujet, jalon, alerte, revue documentaire.",
              "Statut : en cours, réussi, en attente d'approbation, échoué.",
              "Actions produites : notifications, mises à jour de statuts, documents affectés."
            ]
          }
        ]
      },
      {
        id: "workflows-approbations",
        title: "Étapes d'approbation humaine",
        lead: "La différence essentielle avec l'informatique est ici : le workflow prépare et trace, mais la validation reste portée par les acteurs compétents.",
        blocks: [
          {
            title: "Gates humains affichés",
            description: "Les cartes d'approbation expliqueront quels accords seront requis selon le type de changement.",
            items: [
              "Validation MOE ou architecte.",
              "Avis CT sur l'incidence réglementaire ou technique.",
              "Arbitrage MOA si impact coût, programme ou planning.",
              "Visa entreprise / BET si impact exécution."
            ],
            actions: [
              { label: "Voir validations requises" }
            ]
          }
        ]
      },
      {
        id: "workflows-checks",
        title: "Checks automatiques",
        lead: "Les checks joueront le rôle de garde-fous procéduraux : complétude, cohérence de nomenclature, présence d'impacts, rattachement à un sujet ou à un document de référence.",
        blocks: [
          {
            title: "Vérifications visibles",
            description: "Chaque check doit être explicite pour être compris et auditable.",
            items: [
              "Présence des champs obligatoires.",
              "Présence des pièces jointes minimales.",
              "Lien avec documents et sujets concernés.",
              "Présence d'une justification de changement.",
              "Présence des relecteurs attendus selon la nature de la proposition."
            ]
          }
        ]
      }
    ]
  });
}
