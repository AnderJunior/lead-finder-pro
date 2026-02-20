# Configuração de Autenticação

## 1. Variáveis de ambiente

Adicione no `.env` (copie de `.env.example`):

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

## 2. Criar o primeiro admin

1. No **Supabase Dashboard** → **Authentication** → **Users** → **Add user**
2. Crie um usuário com e-mail e senha
3. Copie o **UUID** do usuário criado (coluna `id` em `auth.users`)
4. No **SQL Editor**, execute:

```sql
INSERT INTO public.users (email, auth_id, role, status, plano)
VALUES (
  'seu-admin@email.com',
  'uuid-copiado-do-passo-2',
  'admin',
  'ativo',
  'básico'
);
```

## 3. Migrations e RLS

Execute as migrations (se usar Supabase CLI):

```bash
supabase db push
```

Ou aplique manualmente no **SQL Editor** do Supabase (nesta ordem):

1. `migrations/20250220000000_rls_user.sql` - RLS básico
2. `migrations/20250220000002_rename_user_to_users.sql` - Renomear user → users (evita erro 500)
3. `migrations/20250220000003_get_my_profile_function.sql` - Função RPC para login (contorna problemas com PostgREST)

## 4. Edge Function: criar usuário (admin)

Para que admins (role = 'admin' na tabela user) possam criar novos usuários pela tela "Usuários":

1. Instale o Supabase CLI: `npm i -g supabase`  
2. Faça login: `supabase login`
3. Link o projeto: `supabase link --project-ref SEU_PROJECT_REF`
4. Deploy da função: `supabase functions deploy create-user`
5. As variáveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` são injetadas automaticamente pelo Supabase

## 5. Habilitar Auth com e-mail/senha

No **Supabase Dashboard** → **Authentication** → **Providers**:
- Certifique-se de que **Email** está habilitado
- Configure "Confirm email" conforme desejado (para criação manual via admin, pode desativar)
