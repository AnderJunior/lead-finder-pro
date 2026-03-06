-- Quem concluiu a tarefa (para logs do histórico)
alter table public.funil_tarefas
  add column if not exists concluida_por_user_id bigint references public.users(id);

create index if not exists idx_funil_tarefas_concluida_por on public.funil_tarefas(concluida_por_user_id);
