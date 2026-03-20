import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectCoordination(root) {
  renderDoctrinePage(root, {
    contextLabel: "Coordination",
    variant: "coordination",
    scrollId: "projectCoordinationScroll",
    navTitle: "Coordination",
    pageTitle: "Coordination",
    pageIntro: "Cet onglet joue le rôle des Discussions GitHub adaptées au chantier et au projet. Il accueille les échanges utiles mais non normatifs : informations générales, logistique, coordination ponctuelle et annonces d'équipe.",
    navItems: [
      { id: "coordination-canaux", label: "Canaux" },
      { id: "coordination-annonces", label: "Annonces" },
      { id: "coordination-escalade", label: "Escalade" }
    ],
    sections: [
      {
        id: "coordination-canaux",
        title: "Canaux de coordination",
        lead: "Le principe clef est de ne pas confondre discussion libre et sujet formalisé. L'onglet sert à échanger, pas à solder des écarts sans trace structurée.",
        blocks: [
          {
            title: "Sous-canaux prévus",
            description: "Chaque canal montre un usage précis pour éviter de recréer une messagerie confuse.",
            items: [
              "Général : annonces projet et rappels transverses.",
              "Chantier : accès, phasage, contraintes ponctuelles, coactivité.",
              "Interfaces : coordination inter-lots sans création immédiate d'un sujet.",
              "Exploitation future : questions d'usage, maintenance, exploitant.",
              "REX : retours d'expérience capitalisables."
            ],
            actions: [
              { label: "Nouveau canal" },
              { label: "Nouvelle annonce" },
              { label: "Épingler" }
            ]
          }
        ]
      },
      {
        id: "coordination-annonces",
        title: "Format des annonces",
        lead: "L'interface affichera des posts horodatés, signés et catégorisés, avec la possibilité de lier ensuite un échange à un sujet ou une proposition si le point devient normatif.",
        blocks: [
          {
            title: "Ce qu'on verra dans la page",
            description: "Le texte montrera comment une annonce sera comprise par l'utilisateur.",
            badge: "INFO",
            items: [
              "Étiquette de catégorie : logistique, sécurité, accès, planning, information générale.",
              "Zone ou niveau concerné pour les informations de terrain.",
              "Période d'application de l'annonce.",
              "Bouton 'Transformer en sujet' si l'échange révèle un vrai problème à traiter."
            ],
            actions: [
              { label: "Transformer en sujet" },
              { label: "Lier à un jalon" }
            ]
          }
        ]
      },
      {
        id: "coordination-escalade",
        title: "Escalade vers un traitement formel",
        lead: "La doctrine GitHub adaptée à la construction impose qu'un échange informel devienne un objet pilotable dès qu'il produit une décision, une réserve ou un risque.",
        blocks: [
          {
            title: "Ponts avec les autres onglets",
            description: "Ces actions montreront le passage d'une discussion vers le pilotage formel.",
            items: [
              "Créer un sujet à partir d'un message de coordination.",
              "Créer une proposition si un document doit être modifié.",
              "Déclencher un workflow d'alerte si le message signale un point critique chantier.",
              "Associer l'échange à un jalon ou à une zone du projet."
            ]
          }
        ]
      }
    ]
  });
}
