# ESSE DOCUMENTO SE TRATA DA ESTRUTURA ATUAL DO SUPABASE

create table public.users (
  id bigserial not null,
  created_at timestamp with time zone null default now(),
  email character varying(255) not null,
  status character varying null default 'ativo'::character varying,
  plano character varying null default 'básico'::character varying,
  updated_at timestamp without time zone null default now(),
  auth_id uuid null,
  role text null,
  constraint users_pkey primary key (id),
  constraint user_auth_id_fkey foreign KEY (auth_id) references auth.users (id)
) TABLESPACE pg_default;

