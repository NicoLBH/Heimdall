-- Ce qu'une règle a lu pour conclure, enregistré au moment où elle a servi.
--
-- ## Le problème
--
-- Le projet garde l'instantané de chaque règle appliquée : ses conditions, son
-- article, ce qu'elle a conclu. C'est une **description** de l'appel, pas
-- l'appel. Les liens de dépendance étaient donc reconstruits *par nom*, à chaque
-- lecture, en rapprochant « si Hauteur du plancher bas ≤ 28 m » d'une
-- affirmation dont le sujet s'écrit pareil.
--
-- Trois conséquences, et la troisième est celle qui bloque tout :
--
-- - un sujet renommé fait disparaître le lien, en silence ;
-- - on ne peut pas **compter** : `assertion_dependencies` interdit deux fois le
--   même couple, alors qu'une règle peut lire deux fois le même nom ;
-- - on ne peut pas **ordonner** : sans rang ni graphe complet, il n'y a pas de
--   plan de recalcul, donc pas de rejeu.
--
-- Voir `docs/rejouer-la-memoire.md` — c'est l'étape 1.
--
-- ## Ce qu'une ligne dit
--
-- **Une lecture.** Une règle, dans une zone, a lu un nom en n-ième position, et
-- ce nom désignait cette affirmation-là. Une règle qui lit trois faits fait
-- trois lignes ; la même règle appliquée à trois zones en fait neuf.
--
-- Le lien pointe une **affirmation précise**, pas une clé métier — la valeur
-- telle qu'elle était affirmée ce jour-là. C'est la même sémantique que
-- `assertion_dependencies`, qui reste et continue de nourrir le drapeau
-- « à revérifier » : cette table-ci ne la remplace pas, elle dit ce que l'autre
-- ne peut pas dire.
--
-- ## `resolution` : d'où vient le lien
--
-- « enregistre » — le nom a été résolu **au moment du versement**, contre la
-- mémoire contemporaine de la règle : les valeurs qu'elle a réellement vues.
-- Une fois écrit, il ne bouge plus, et un renommage ultérieur ne le casse pas.
--
-- « reconstruit » — le nom a été résolu après coup, contre la mémoire
-- d'aujourd'hui, pour rattraper ce qui a été versé avant cette table. C'est une
-- approximation, et l'écran doit le dire : confondre les deux ferait passer pour
-- établi un lien qui n'est qu'une ressemblance de noms.
--
-- ## Ce que cette table ne fait pas encore
--
-- Les contraintes déduites par un **utilitaire** lisent des faits de contexte,
-- pas des affirmations : leurs entrées n'ont pas d'identifiant à citer. La
-- colonne `utility` et l'`input_assertion_id` nullable leur laissent la place,
-- et rien ici ne devra changer le jour où l'outil climatique nommera ses
-- sources.
--
-- Additive : aucune colonne existante n'est modifiée ni supprimée.

create table if not exists public.assertion_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  -- La règle appliquée — l'instantané qui porte les conditions. `null` quand le
  -- producteur n'est pas une règle du projet.
  rule_assertion_id uuid references public.project_assertions(id) on delete set null,

  -- Ce que l'appel a produit. Si elle disparaît, l'appel n'a plus d'objet.
  output_assertion_id uuid not null references public.project_assertions(id) on delete cascade,

  -- Ce que l'appel a lu. `null` : le nom ne désignait rien que le projet ait
  -- versé — c'est le trou du raisonnement, et il se compte comme le reste.
  input_assertion_id uuid references public.project_assertions(id) on delete set null,

  -- Le nom lu, conservé même quand il ne désigne rien. Sans lui, une entrée
  -- manquante serait une ligne vide au lieu d'une question.
  input_subject text not null check (length(btrim(input_subject)) > 0),

  -- L'ordre de lecture dans l'appel, à partir de 1. Deux lectures du même nom
  -- font deux lignes : c'est exactement ce que l'unicité de l'autre table
  -- interdisait, et c'est ce qui permet de compter.
  input_rank integer not null check (input_rank >= 1),

  -- La portée de l'appel. '' vaut « partout » — une portée, pas une ignorance.
  zone text not null default '',

  -- L'utilitaire producteur, nom et version, quand il y en a un.
  utility text,

  -- Par quel versement. `null` pour un lien reconstruit après coup.
  proposition_id uuid references public.propositions(id) on delete set null,

  resolution text not null default 'enregistre'
    check (resolution in ('enregistre', 'reconstruit')),

  created_at timestamptz not null default now(),

  -- Un appel est identifié par ce qu'il produit et sa portée ; le rang fait le
  -- reste. Rejouer la reconstruction ne duplique donc rien.
  unique (output_assertion_id, zone, input_rank)
);

create index if not exists assertion_applications_project_idx
  on public.assertion_applications (project_id);

-- « Qu'est-ce qui repose sur cette valeur ? » est la question qu'on pose en
-- changeant une donnée de base, et c'est la plus importante des deux.
create index if not exists assertion_applications_input_idx
  on public.assertion_applications (input_assertion_id);

create index if not exists assertion_applications_output_idx
  on public.assertion_applications (output_assertion_id);

-- Le compte par nom, pour les entrées qu'aucune affirmation ne porte.
create index if not exists assertion_applications_subject_idx
  on public.assertion_applications (project_id, input_subject);

alter table public.assertion_applications enable row level security;

-- La même politique que la table qu'elle relie, mot pour mot — comme pour
-- `assertion_dependencies`. En poser une plus stricte rendrait la mémoire
-- lisible et son raisonnement invisible, ce qui est le mensonge que cette étape
-- existe pour éviter. Le jour où `project_assertions` se referme, les trois se
-- referment ensemble.
drop policy if exists "assertion_applications_open_all" on public.assertion_applications;
create policy "assertion_applications_open_all"
on public.assertion_applications
for all
to anon, authenticated
using (true)
with check (true);

comment on table public.assertion_applications is
  'Ce qu''une règle a lu pour conclure : une ligne par lecture, avec son rang et sa zone. Voir docs/rejouer-la-memoire.md, étape 1.';
