-- Les recherches épinglées de la Mémoire — et à personne d'autre.
--
-- On revient toujours aux mêmes questions : « les hypothèses du bâtiment A »,
-- « ce qui reste sans domaine », « les contraintes incendie versées ce mois-ci ».
-- Les retaper à chaque fois use, et l'on finit par ne plus filtrer du tout —
-- c'est-à-dire par lire trois cents lignes à l'œil.
--
-- Elles ont d'abord vécu dans le navigateur. C'était la garantie la plus simple
-- qui soit, et elle se payait comme se paie toujours celle-là : une épingle
-- perdue en changeant de poste, effacée avec les données du site, introuvable
-- le lendemain sur un autre écran.
--
-- ## Elles sont personnelles, et cela se garantit ici
--
-- Une recherche épinglée n'est pas ce que le projet sait, c'est **la façon dont
-- quelqu'un travaille**. Le bureau de contrôle épingle ce qui reste à
-- revérifier, l'architecte ce qui touche à son lot, et aucun des deux n'a
-- besoin de voir les épingles de l'autre — ni envie qu'on lise les siennes, qui
-- disent ce qu'il surveille.
--
-- La politique est donc celle des discussions du copilote, mot pour mot :
-- **propriétaire seul**, dans les deux sens.
--
--   using       — on ne lit que les siennes ;
--   with check  — on n'en écrit que pour soi.
--
-- Sans `with check`, on ne verrait pas les épingles des autres mais on pourrait
-- leur en fabriquer. Et `to authenticated` seulement : la clé anonyme ne désigne
-- personne, donc `auth.uid()` y est nul, donc aucune ligne ne lui appartient —
-- mais l'écrire évite d'avoir à s'en convaincre.
--
-- Le projet est rattaché pour que les épingles se rangent par chantier, et **il
-- n'ouvre aucun droit** : appartenir au projet ne donne pas accès aux épingles
-- de ceux qui y travaillent. C'est la différence entre « ranger » et
-- « partager ».
--
-- ## Ce qui est écrit
--
-- La requête, telle qu'elle se retape dans la barre de recherche, et le nom
-- qu'on lui a donné. Pas ce qu'elle trouve : cela se recalcule à chaque
-- ouverture, et le figer en ferait une réponse périmée dès le versement suivant
-- (`docs/fondamentaux.md`, règle 4).
--
-- Additive : aucune table ni colonne existante n'est modifiée.

create table if not exists public.memory_pinned_searches (
  id uuid primary key default gen_random_uuid(),

  -- Le chantier dont on parle. Il range, il n'autorise pas.
  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le seul qui puisse lire cette épingle. `default auth.uid()` évite qu'un
  -- appelant distrait écrive une ligne au nom d'un autre : la valeur par défaut
  -- est déjà la bonne, et `with check` refuse toute autre.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Ce qu'on retape aujourd'hui dans la barre : « nature:hypothese zone:… ».
  query text not null check (length(btrim(query)) > 0),

  -- Le nom sous lequel on la retrouve. Vide, c'est la requête qui fait office —
  -- elle se lit, et c'est elle qu'on reconnaît.
  title text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Une même requête ne s'épingle pas deux fois pour la même personne sur le
  -- même chantier : on aurait deux entrées qui font la même chose, et l'on ne
  -- saurait plus laquelle effacer.
  unique (owner_id, project_id, query)
);

-- Les épingles d'une personne sur un projet, dans l'ordre où elle les a posées :
-- c'est l'ordre du rail, et il ne se réordonne pas tout seul.
create index if not exists memory_pinned_searches_owner_idx
  on public.memory_pinned_searches (owner_id, project_id, created_at);

alter table public.memory_pinned_searches enable row level security;

drop policy if exists "memory_pinned_searches_owner_only" on public.memory_pinned_searches;
create policy "memory_pinned_searches_owner_only"
on public.memory_pinned_searches
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
