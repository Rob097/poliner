-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Fix: pollai SELECT permette anche al creatore  ║
-- ║                                                          ║
-- ║  Quando si crea un pollaio con INSERT-RETURNING, Postgres║
-- ║  verifica che il row sia "visible" via SELECT policy PRIMA║
-- ║  dei trigger AFTER INSERT. La membership auto-creata dal  ║
-- ║  trigger non è quindi ancora visibile e l'INSERT fallisce.║
-- ║                                                          ║
-- ║  Soluzione: includere `auth.uid() = user_id` come         ║
-- ║  fallback nella SELECT policy. Concettualmente coerente:  ║
-- ║  il creatore è sempre membro del proprio pollaio.         ║
-- ╚══════════════════════════════════════════════════════════╝

drop policy if exists "pollai_select_members" on public.pollai;

create policy "pollai_select_members" on public.pollai
  for select using (
    public.is_my_pollaio(id) or auth.uid() = user_id
  );
