-- Keep the authenticated app access scoped to members only.
-- Public read-only access stays limited to the explicit *_select_public policies
-- used by the /p/<slug> page.

DROP POLICY IF EXISTS "pollai_select_members" ON public.pollai;
CREATE POLICY "pollai_select_members" ON public.pollai
  FOR SELECT TO authenticated
  USING (
    public.is_my_pollaio(id) OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "pollai_update_admin" ON public.pollai;
CREATE POLICY "pollai_update_admin" ON public.pollai
  FOR UPDATE TO authenticated
  USING (public.my_pollaio_role(id) = 'admin');

DROP POLICY IF EXISTS "pollai_delete_admin" ON public.pollai;
CREATE POLICY "pollai_delete_admin" ON public.pollai
  FOR DELETE TO authenticated
  USING (public.my_pollaio_role(id) = 'admin');

DROP POLICY IF EXISTS "animali_select" ON public.animali;
CREATE POLICY "animali_select" ON public.animali
  FOR SELECT TO authenticated
  USING (public.is_my_pollaio(pollaio_id));

DROP POLICY IF EXISTS "animali_insert" ON public.animali;
CREATE POLICY "animali_insert" ON public.animali
  FOR INSERT TO authenticated
  WITH CHECK (public.is_my_pollaio(pollaio_id));

DROP POLICY IF EXISTS "animali_update" ON public.animali;
CREATE POLICY "animali_update" ON public.animali
  FOR UPDATE TO authenticated
  USING (public.is_my_pollaio(pollaio_id));

DROP POLICY IF EXISTS "animali_delete" ON public.animali;
CREATE POLICY "animali_delete" ON public.animali
  FOR DELETE TO authenticated
  USING (public.is_my_pollaio(pollaio_id));