import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectReferentiel(root) {
  renderDoctrinePage(root, {
    contextLabel: "Référentiel",
    variant: "referentiel",
    scrollId: "projectReferentielScroll",
    navTitle: "Référentiel",
    pageTitle: "Référentiel",
    pageIntro: "Cet onglet joue le rôle du Wiki adapté au projet de construction. Il contient la doctrine stable : textes applicables, conventions, glossaire, standards documentaires et règles de gestion, sans se substituer aux documents de projet vivants.",
    navItems: [
      { id: "referentiel-textes", label: "Textes applicables" },
      { id: "referentiel-methodes", label: "Méthodes" },
      { id: "referentiel-standards", label: "Standards" },
      { id: "referentiel-glossaire", label: "Glossaire" }
    ],
    sections: [
      {
        id: "referentiel-textes",
        title: "Textes et exigences applicables",
        lead: "L'utilisateur doit voir immédiatement sur quelles bases techniques, réglementaires ou contractuelles le projet est piloté.",
        blocks: [
          {
            title: "Bibliothèque de références",
            description: "Ces cartes montreront plus tard les textes réellement applicables au projet.",
            items: [
              "Eurocodes, DTU, arrêtés, référentiels incendie, accessibilité, thermique, acoustique, etc.",
              "Exigences spécifiques du maître d'ouvrage ou de l'exploitant.",
              "Rattachement de chaque exigence aux disciplines ou types de sujets concernés.",
              "Traçabilité des mises à jour du référentiel utilisé."
            ],
            actions: [
              { label: "Ajouter une référence" },
              { label: "Lier à un sujet" }
            ]
          }
        ]
      },
      {
        id: "referentiel-methodes",
        title: "Méthodes projet et doctrine de traitement",
        lead: "Cette zone documente comment le projet fonctionne : classement des sujets, procédure de revue, critères de clôture, niveau de preuve attendu.",
        blocks: [
          {
            title: "Méthodes visibles",
            description: "Le contenu vise à rendre explicite la gouvernance plutôt qu'à accumuler des fichiers divers.",
            items: [
              "Procédure de création et de revue d'une proposition.",
              "Règles de formulation et de criticité des sujets.",
              "Conditions de clôture d'un sujet et preuves attendues.",
              "Règles de diffusion documentaire et de mise en vigueur."
            ]
          }
        ]
      },
      {
        id: "referentiel-standards",
        title: "Standards documentaires",
        lead: "L'onglet montrera comment sont fixées les conventions de nommage, les métadonnées obligatoires et les structures de classement.",
        blocks: [
          {
            title: "Conventions projet",
            description: "Ces points servent à stabiliser le langage commun du projet.",
            badge: "STD",
            items: [
              "Nomenclature des documents.",
              "Conventions de version et de diffusion.",
              "Taxonomie des zones, bâtiments, niveaux et lots.",
              "Modèles de fiches de sujet et de proposition."
            ]
          }
        ]
      },
      {
        id: "referentiel-glossaire",
        title: "Glossaire et FAQ",
        lead: "Cette partie est utile pour homogénéiser les termes entre MOA, MOE, BET, CT et entreprises.",
        blocks: [
          {
            title: "Aides prévues",
            description: "Le but est de réduire les ambiguïtés métier et procédurales.",
            items: [
              "Glossaire projet et acronymes.",
              "FAQ sur les statuts documentaires et statuts de sujets.",
              "Aide sur les rôles de validation.",
              "Rappels sur les différences entre discussion, sujet et proposition."
            ]
          }
        ]
      }
    ]
  });
}
