-- ============================================================
-- Delivery Notes feature (modelled on quotations)
-- ============================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE delivery_note_status AS ENUM ('draft', 'sent', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- delivery_notes table
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  delivery_note_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_tpin TEXT,
  notes TEXT,
  delivery_date DATE,
  status delivery_note_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- delivery_note_items table
CREATE TABLE IF NOT EXISTS public.delivery_note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_note_id UUID NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;

-- RLS policies: owners + cashiers (members) can manage
DROP POLICY IF EXISTS "Members can view delivery notes" ON public.delivery_notes;
CREATE POLICY "Members can view delivery notes"
  ON public.delivery_notes FOR SELECT
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Members can insert delivery notes" ON public.delivery_notes;
CREATE POLICY "Members can insert delivery notes"
  ON public.delivery_notes FOR INSERT
  WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Members can update delivery notes" ON public.delivery_notes;
CREATE POLICY "Members can update delivery notes"
  ON public.delivery_notes FOR UPDATE
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners can delete delivery notes" ON public.delivery_notes;
CREATE POLICY "Owners can delete delivery notes"
  ON public.delivery_notes FOR DELETE
  USING (public.owns_business(business_id));

DROP POLICY IF EXISTS "Members can view delivery note items" ON public.delivery_note_items;
CREATE POLICY "Members can view delivery note items"
  ON public.delivery_note_items FOR SELECT
  USING (delivery_note_id IN (SELECT id FROM public.delivery_notes WHERE public.is_business_member(business_id)));

DROP POLICY IF EXISTS "Members can insert delivery note items" ON public.delivery_note_items;
CREATE POLICY "Members can insert delivery note items"
  ON public.delivery_note_items FOR INSERT
  WITH CHECK (delivery_note_id IN (SELECT id FROM public.delivery_notes WHERE public.is_business_member(business_id)));

DROP POLICY IF EXISTS "Members can update delivery note items" ON public.delivery_note_items;
CREATE POLICY "Members can update delivery note items"
  ON public.delivery_note_items FOR UPDATE
  USING (delivery_note_id IN (SELECT id FROM public.delivery_notes WHERE public.is_business_member(business_id)));

DROP POLICY IF EXISTS "Members can delete delivery note items" ON public.delivery_note_items;
CREATE POLICY "Members can delete delivery note items"
  ON public.delivery_note_items FOR DELETE
  USING (delivery_note_id IN (SELECT id FROM public.delivery_notes WHERE public.is_business_member(business_id)));

-- Number generator
CREATE OR REPLACE FUNCTION public.generate_delivery_note_number(biz_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  next_seq INTEGER;
  new_number TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(delivery_note_number FROM 'DN-' || current_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM public.delivery_notes
  WHERE business_id = biz_id
    AND delivery_note_number LIKE 'DN-' || current_year || '-%';

  new_number := 'DN-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Atomic create delivery note + items
CREATE OR REPLACE FUNCTION public.create_delivery_note_with_items(
  p_business_id uuid,
  p_header jsonb,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_number text;
  v_item jsonb;
BEGIN
  IF NOT public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  v_number := public.generate_delivery_note_number(p_business_id);

  INSERT INTO public.delivery_notes (
    business_id, delivery_note_number,
    customer_name, customer_phone, customer_email, customer_tpin,
    notes, delivery_date, status
  ) VALUES (
    p_business_id, v_number,
    p_header->>'customer_name', p_header->>'customer_phone', p_header->>'customer_email', p_header->>'customer_tpin',
    p_header->>'notes',
    NULLIF(p_header->>'delivery_date','')::date,
    COALESCE((p_header->>'status')::delivery_note_status, 'draft'::delivery_note_status)
  ) RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.delivery_note_items (
      delivery_note_id, product_id, product_name, quantity, unit_price, line_total
    ) VALUES (
      v_id,
      NULLIF(v_item->>'product_id','')::uuid,
      v_item->>'product_name',
      GREATEST(COALESCE((v_item->>'quantity')::int, 1), 1),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'line_total')::numeric, 0)
    );
  END LOOP;

  RETURN v_id;
END;
$$;

-- Realtime + replica identity
ALTER TABLE public.delivery_notes REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_note_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='delivery_notes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_notes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='delivery_note_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_note_items';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_delivery_note_with_items(uuid, jsonb, jsonb) FROM PUBLIC, anon;