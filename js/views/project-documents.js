import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectDocuments(root) {
  renderDoctrinePage(root, {
    contextLabel: "Documents",
    variant: "documents",
    scrollId: "projectDocumentsScroll",
    navTitle: "Documents",
    pageTitle: "Documents",
    pageIntro: "Cet onglet devient le référentiel documentaire du projet. Il ne sert plus à déposer directement une pièce candidate, mais à consulter la définition de référence, sa structure, son historique et ses liens avec les sujets et propositions.",
    navItems: [
      { id: "documents-arborescence", label: "Arborescence" },
      { id: "documents-versions", label: "Versions" },
      { id: "documents-liens", label: "Liens projet" },
      { id: "documents-diffusion", label: "Diffusion" }
    ],
    sections: [
      {
        id: "documents-arborescence",
        title: "Arborescence documentaire",
        lead: "La vue principale montrera la bibliothèque projet par discipline, phase, bâtiment, niveau ou lot. Chaque document aura un statut clair : brouillon, pour revue, en vigueur, remplacé, archivé.",
        blocks: [
          {
            title: "Menus et filtres visibles",
            description: "Ils servent à comprendre comment le référentiel sera exploré sans encore activer la logique métier.",
            badge: "UI",
            items: [
              "Bouton 'Nouvelle vue' pour alterner entre arborescence, liste, lot, phase et zone.",
              "Champ de recherche pour retrouver un plan, une note de calcul, une fiche produit ou un PV.",
              "Filtres par discipline, phase, statut documentaire, bâtiment, niveau et auteur de diffusion.",
              "Tri par date de version, nom, criticité ou date de mise en vigueur."
            ],
            actions: [
              { label: "Nouvelle vue" },
              { label: "Filtrer" },
              { label: "Comparer versions" }
            ]
          },
          {
            title: "Objet métier visé",
            description: "Le document n'est plus un simple fichier. Il devient une pièce gouvernée, reliée à la vie du projet.",
            badge: "DOCTRINE",
            items: [
              "Chaque document sera relié à sa version en vigueur et à ses versions précédentes.",
              "Une pièce pourra afficher les sujets ouverts qui la concernent.",
              "Une pièce pourra pointer vers la proposition qui l'a créée ou modifiée.",
              "Une pièce remplacée restera consultable mais ne fera plus foi."
            ]
          }
        ]
      },
      {
        id: "documents-versions",
        title: "Versions et différence avec GitHub",
        lead: "Ici, la logique 'main branch' devient la définition de projet en vigueur. Une proposition approuvée met à jour cette définition.",
        blocks: [
          {
            title: "Version de référence",
            description: "Le cœur de l'onglet est la distinction entre document proposé et document en vigueur.",
            badge: "MAIN",
            items: [
              "Un cartouche 'Version en vigueur' indiquera le document qui fait foi sur le projet.",
              "Un historique affichera les remplacements successifs avec date, auteur, motif et proposition source.",
              "Un bouton 'Voir les écarts' servira plus tard à comparer deux versions de plans ou de notices.",
              "Un indicateur signalera si une version en vigueur a encore des sujets ouverts non soldés."
            ],
            actions: [
              { label: "Voir les écarts" },
              { label: "Historique" }
            ]
          }
        ]
      },
      {
        id: "documents-liens",
        title: "Liens avec les autres onglets",
        lead: "Le référentiel documentaire est traversé par les sujets, les propositions et les jalons.",
        blocks: [
          {
            title: "Panneaux latéraux prévus",
            description: "Ces encarts explicatifs montreront les relations croisées.",
            items: [
              "Sujet liés : remarques, avis ou non-conformités qui ciblent le document.",
              "Propositions liées : demandes de modification encore en revue ou déjà intégrées.",
              "Jalons liés : étape du projet pour laquelle ce document est attendu ou exigé.",
              "Référentiel lié : norme, texte ou exigence servant de base d'analyse."
            ]
          }
        ]
      },
      {
        id: "documents-diffusion",
        title: "Diffusion et preuve de mise à jour",
        lead: "Contrairement au logiciel, l'intégration d'un document ne suffit pas : il faut aussi maîtriser sa diffusion et son applicabilité sur le terrain.",
        blocks: [
          {
            title: "Commandes affichées",
            description: "Elles rendront visible la future chaîne de diffusion après approbation d'une proposition.",
            badge: "FLOW",
            items: [
              "Générer bordereau de diffusion.",
              "Notifier les intervenants concernés.",
              "Marquer les versions précédentes comme remplacées.",
              "Associer les preuves de prise en compte chantier ou visa."
            ],
            actions: [
              { label: "Générer bordereau" },
              { label: "Notifier" },
              { label: "Associer preuve" }
            ]
          }
        ]
      }
    ]
  });
}
