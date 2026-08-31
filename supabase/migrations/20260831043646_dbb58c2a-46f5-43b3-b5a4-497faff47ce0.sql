GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_notes TO authenticated;
GRANT ALL ON public.delivery_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_note_items TO authenticated;
GRANT ALL ON public.delivery_note_items TO service_role;