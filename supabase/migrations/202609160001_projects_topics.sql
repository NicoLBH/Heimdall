-- Un projet dit de quoi il parle, en quelques mots-clés.
--
-- ## Ce qui manquait
--
-- L'onglet Fichiers montre une section « À propos » : une description courte, et
-- les sujets du projet. La description existait déjà — `projects.description` —,
-- les sujets nulle part. Sans eux, on ne peut pas répondre à la question qu'on
-- se pose en ouvrant un projet qu'on ne connaît pas : « de quoi s'agit-il ? ».
--
-- ## Pourquoi un tableau de texte, et pas une table
--
-- Un mot-clé n'a pas d'existence propre : il n'a ni auteur, ni date, ni
-- histoire, et il ne se retrouve jamais seul. Une table de mots-clés
-- introduirait une jointure et une identité pour ce qui n'est qu'une étiquette
-- posée sur un projet. Le jour où un mot-clé devra porter autre chose que son
-- nom, ce sera une autre décision, prise pour de bonnes raisons.
--
-- ## Strictement additive
--
-- Une colonne de plus, avec un défaut. Aucune ligne existante ne change, et une
-- application qui ignore cette colonne continue de fonctionner à l'identique.

alter table public.projects
  add column if not exists topics text[] not null default '{}'::text[];

comment on column public.projects.topics is
  'Les mots-clés du projet, tels que la section « À propos » les montre. Étiquettes, pas entités.';
