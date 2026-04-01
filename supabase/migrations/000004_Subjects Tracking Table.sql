create table if not exists public.subjects (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    document_id uuid not null references public.documents(id) on delete cascade,
    analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
    subject_type text not null,
    title text not null,
    description text not null,
    priority text not null default 'medium',
    status text not null default 'open',
    confidence_score numeric,
    rationale text,
    source_excerpt text,
    source_page integer,
    source_anchor_json jsonb,
    dedup_key text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
