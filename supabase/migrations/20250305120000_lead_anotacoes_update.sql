-- Policy para atualizar anotações do lead
create policy "lead_anotacoes_update"
  on public.lead_anotacoes for update
  using (empresa_id = (select empresa_id from public.users where auth_id = auth.uid()))
  with check (empresa_id = (select empresa_id from public.users where auth_id = auth.uid()));
