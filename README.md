# rapsobot-poc
Documents
Cet onglet devient le référentiel documentaire du projet. Il ne sert plus à déposer directement une pièce candidate, mais à consulter la définition de référence, sa structure, son historique et ses liens avec les sujets et propositions.

Arborescence documentaire
La vue principale montrera la bibliothèque projet par discipline, phase, bâtiment, niveau ou lot. Chaque document aura un statut clair : brouillon, pour revue, en vigueur, remplacé, archivé.

Menus et filtres visibles
Ils servent à comprendre comment le référentiel sera exploré sans encore activer la logique métier.

UI
Bouton 'Nouvelle vue' pour alterner entre arborescence, liste, lot, phase et zone.
Champ de recherche pour retrouver un plan, une note de calcul, une fiche produit ou un PV.
Filtres par discipline, phase, statut documentaire, bâtiment, niveau et auteur de diffusion.
Tri par date de version, nom, criticité ou date de mise en vigueur.
Nouvelle vue
Filtrer
Comparer versions
Objet métier visé
Le document n'est plus un simple fichier. Il devient une pièce gouvernée, reliée à la vie du projet.

DOCTRINE
Chaque document sera relié à sa version en vigueur et à ses versions précédentes.
Une pièce pourra afficher les sujets ouverts qui la concernent.
Une pièce pourra pointer vers la proposition qui l'a créée ou modifiée.
Une pièce remplacée restera consultable mais ne fera plus foi.
Versions et différence avec GitHub
Ici, la logique 'main branch' devient la définition de projet en vigueur. Une proposition approuvée met à jour cette définition.

Version de référence
Le cœur de l'onglet est la distinction entre document proposé et document en vigueur.

MAIN
Un cartouche 'Version en vigueur' indiquera le document qui fait foi sur le projet.
Un historique affichera les remplacements successifs avec date, auteur, motif et proposition source.
Un bouton 'Voir les écarts' servira plus tard à comparer deux versions de plans ou de notices.
Un indicateur signalera si une version en vigueur a encore des sujets ouverts non soldés.
Voir les écarts
Historique
Liens avec les autres onglets
Le référentiel documentaire est traversé par les sujets, les propositions et les jalons.

Panneaux latéraux prévus
Ces encarts explicatifs montreront les relations croisées.

Sujet liés : remarques, avis ou non-conformités qui ciblent le document.
Propositions liées : demandes de modification encore en revue ou déjà intégrées.
Jalons liés : étape du projet pour laquelle ce document est attendu ou exigé.
Référentiel lié : norme, texte ou exigence servant de base d'analyse.
Diffusion et preuve de mise à jour
Contrairement au logiciel, l'intégration d'un document ne suffit pas : il faut aussi maîtriser sa diffusion et son applicabilité sur le terrain.

Commandes affichées
Elles rendront visible la future chaîne de diffusion après approbation d'une proposition.

FLOW
Générer bordereau de diffusion.
Notifier les intervenants concernés.
Marquer les versions précédentes comme remplacées.
Associer les preuves de prise en compte chantier ou visa.
Générer bordereau
Notifier
Associer preuve
