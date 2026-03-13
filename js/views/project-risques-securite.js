import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectRisquesSecurite(root) {
  renderDoctrinePage(root, {
    contextLabel: "Risques & sécurité",
    variant: "risques-securite",
    scrollId: "projectRisquesSecuriteScroll",
    navTitle: "Risques & sécurité",
    pageTitle: "Risques & sécurité",
    pageIntro: "Cet onglet élargit l'idée GitHub Security. Il ne se limite pas à la sécurité chantier : il couvre aussi les accès sensibles, la conformité critique, les incidents, les risques projet et la traçabilité des validations à forte portée.",
    navItems: [
      { id: "risques-acces", label: "Accès & confidentialité" },
      { id: "risques-chantier", label: "Sécurité chantier" },
      { id: "risques-conformite", label: "Conformité critique" },
      { id: "risques-incidents", label: "Incidents" }
    ],
    sections: [
      {
        id: "risques-acces",
        title: "Accès et confidentialité",
        lead: "Le projet de construction manipule parfois des documents sensibles, des données d'accès ou des informations à diffusion restreinte.",
        blocks: [
          {
            title: "Sous-menus prévus",
            description: "Ils montreront comment la plateforme structurera les accès et la sensibilité des contenus.",
            items: [
              "Documents sensibles ou à diffusion restreinte.",
              "Traçabilité des accès et téléchargements.",
              "Rôles autorisés à consulter, proposer, valider ou diffuser.",
              "Alertes sur les pièces critiques sans validation requise."
            ],
            actions: [
              { label: "Voir droits" },
              { label: "Voir documents sensibles" }
            ]
          }
        ]
      },
      {
        id: "risques-chantier",
        title: "Sécurité chantier et prévention",
        lead: "Cette zone servira à afficher les informations de prévention, les zones à risques, les alertes de coactivité et les points sécurité qui doivent rester visibles pour tous les acteurs concernés.",
        blocks: [
          {
            title: "Objets métier visés",
            description: "Ils donnent à voir l'adaptation construction du concept de sécurité.",
            badge: "SAFETY",
            items: [
              "Consignes, PPSPS, zones à risques et restrictions temporaires.",
              "Alertes sécurité ouvertes et clôturées.",
              "Liens entre annonces de coordination et sujets critiques sécurité.",
              "Historique des décisions prises à la suite d'un risque terrain."
            ]
          }
        ]
      },
      {
        id: "risques-conformite",
        title: "Conformité critique",
        lead: "Certaines exigences ont un poids particulier : incendie, stabilité, évacuation, accessibilité, sismique, etc. L'onglet permettra de visualiser ces points à part.",
        blocks: [
          {
            title: "Cartes de vigilance",
            description: "Elles feront ressortir les sujets et propositions à fort enjeu réglementaire ou assurantiel.",
            items: [
              "Sujets critiques non clos.",
              "Propositions impactant une exigence réglementaire majeure.",
              "Documents en vigueur avec réserves persistantes.",
              "Validations sensibles encore en attente."
            ]
          }
        ]
      },
      {
        id: "risques-incidents",
        title: "Journal d'incidents et signaux faibles",
        lead: "Le journal montrera la traçabilité des incidents, presque-incidents et alertes remontées dans le projet.",
        blocks: [
          {
            title: "Colonnes prévues",
            description: "Cette vue servira de mémoire et de levier de gouvernance.",
            items: [
              "Date, auteur, zone, nature de l'incident.",
              "Mesure immédiate prise.",
              "Sujet ou proposition créée à la suite de l'incident.",
              "Statut d'analyse et de clôture."
            ],
            actions: [
              { label: "Nouvelle alerte" },
              { label: "Créer sujet associé" }
            ]
          }
        ]
      }
    ]
  });
}
