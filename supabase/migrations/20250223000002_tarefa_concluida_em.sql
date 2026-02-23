-- Campo para registrar quando a tarefa foi concluída
alter table public.funil_tarefas
  add column if not exists concluida_em timestamptz default null;
