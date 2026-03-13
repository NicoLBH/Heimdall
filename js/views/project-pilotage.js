import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectPilotage(root) {
  renderDoctrinePage(root, {
    contextLabel: "Pilotage",
    variant: "pilotage",
    scrollId: "projectPilotageScroll",
    navTitle: "Pilotage",
    pageTitle: "Pilotage",
    pageIntro: "Cet onglet reprend l'esprit Insights de GitHub mais l'oriente métier. Il montrera la santé du projet : volume de sujets, délais de traitement, stabilité documentaire, proximité des jalons et zones de risque.",
    navItems: [
      { id: "pilotage-activite", label: "Activité" },
      { id: "pilotage-backlog", label: "Backlog" },
      { id: "pilotage-qualite", label: "Qualité du flux" },
      { id: "pilotage-risques", label: "Tendances de risque" }
    ],
    sections: [
      {
        id: "pilotage-activite",
        title: "Activité projet",
        lead: "La page affichera des graphiques et compteurs expliquant comment le projet évolue dans le temps.",
        blocks: [
          {
            title: "Indicateurs visibles",
            description: "Ils aident à voir l'activité sans se limiter à un simple volume de documents déposés.",
            items: [
              "Nombre de sujets ouverts, clos et réouverts.",
              "Nombre de propositions créées, approuvées, rejetées, intégrées.",
              "Nombre de documents remplacés par phase ou discipline.",
              "Répartition des échanges de coordination."
            ]
          }
        ]
      },
      {
        id: "pilotage-backlog",
        title: "Backlog et capacité de traitement",
        lead: "L'objectif est de rendre visible la pression de traitement sur le projet avant qu'elle ne devienne critique.",
        blocks: [
          {
            title: "Mesures de backlog",
            description: "Ces métriques seront plus utiles que des indicateurs purement cosmétiques.",
            badge: "FLOW",
            items: [
              "Temps moyen de prise en charge d'un sujet.",
              "Temps moyen de revue d'une proposition.",
              "Répartition des sujets par discipline, zone et responsable.",
              "Nombre de points bloquants restant avant chaque jalon."
            ],
            actions: [
              { label: "Voir backlog critique" },
              { label: "Voir par responsable" }
            ]
          }
        ]
      },
      {
        id: "pilotage-qualite",
        title: "Qualité du flux projet",
        lead: "Le pilotage doit aussi montrer si la mécanique fonctionne bien : sujets bien formulés, décisions stables, documents qui ne churnent pas inutilement.",
        blocks: [
          {
            title: "Indicateurs de qualité",
            description: "Ils permettront de juger la robustesse du processus, pas seulement sa vitesse.",
            items: [
              "Taux de réouverture des sujets.",
              "Taux de propositions rejetées pour dossier incomplet.",
              "Fréquence de remplacement documentaire par zone ou discipline.",
              "Taux de sujets clos avec preuve attachée."
            ]
          }
        ]
      },
      {
        id: "pilotage-risques",
        title: "Tendances de risque",
        lead: "Une vue synthétique montrera où le projet devient instable : surcharges sur une discipline, accumulation de sujets critiques, convergence insuffisante avant jalon.",
        blocks: [
          {
            title: "Vue de synthèse",
            description: "Cette vue sera le pendant construction des insights les plus utiles.",
            items: [
              "Heatmap par zone, lot ou discipline.",
              "Courbe d'approche des jalons avec points bloquants restants.",
              "Liste des validations critiques encore attendues.",
              "Tendance des alertes sécurité et incidents."
            ]
          }
        ]
      }
    ]
  });
}
