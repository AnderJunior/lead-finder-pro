-- Tabela de anotações do lead
create table if not exists public.lead_anotacoes (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads_captados(id) on delete cascade,
  texto text not null,
  user_id bigint not null references public.users(id),
  empresa_id bigint not null,
  created_at timestamptz default now()
);

create index if not exists idx_lead_anotacoes_lead on public.lead_anotacoes(lead_id);

alter table public.lead_anotacoes enable row level security;

create policy "lead_anotacoes_select"
  on public.lead_anotacoes for select
  using (empresa_id = (select empresa_id from public.users where auth_id = auth.uid()));

create policy "lead_anotacoes_insert"
  on public.lead_anotacoes for insert
  with check (empresa_id = (select empresa_id from public.users where auth_id = auth.uid()));

create policy "lead_anotacoes_delete"
  on public.lead_anotacoes for delete
  using (empresa_id = (select empresa_id from public.users where auth_id = auth.uid()));
