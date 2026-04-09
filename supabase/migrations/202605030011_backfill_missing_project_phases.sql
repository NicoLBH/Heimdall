with phase_catalog(phase_code, phase_label, phase_order) as (
  values
    ('PC', 'Permis de Construire', 1),
    ('AT', 'Autorisation de Travaux', 2),
    ('APS', 'Avant Projet Sommaire', 3),
    ('APD', 'Avant Projet Détaillé', 4),
    ('PRO', 'Projet', 5),
    ('DCE', 'Dossier de Consultation des Entreprises', 6),
    ('MARCHE', 'Marchés', 7),
    ('EXE', 'Exécution', 8),
    ('DOE', 'Dossier des Ouvrages Exécutés', 9),
    ('GPA', 'Année de Garantie de Parfait Achèvement', 10),
    ('EXPLOIT', 'Exploitation', 11)
)
insert into public.project_phases (project_id, phase_code, phase_label, phase_order, phase_date)
select
  p.id,
  c.phase_code,
  c.phase_label,
  c.phase_order,
  null
from public.projects p
cross join phase_catalog c
where not exists (
  select 1
  from public.project_phases pp
  where pp.project_id = p.id
    and pp.phase_code = c.phase_code
)
on conflict (project_id, phase_code) do nothing;
