ALTER TABLE public.delivery_notes
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS vehicle_registration text,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS show_prices boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.create_delivery_note_with_items(p_business_id uuid, p_header jsonb, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    delivery_address, reference_number, driver_name, vehicle_registration, received_by, show_prices,
    notes, delivery_date, status
  ) VALUES (
    p_business_id, v_number,
    p_header->>'customer_name', p_header->>'customer_phone', p_header->>'customer_email', p_header->>'customer_tpin',
    p_header->>'delivery_address', p_header->>'reference_number', p_header->>'driver_name',
    p_header->>'vehicle_registration', p_header->>'received_by',
    COALESCE((p_header->>'show_prices')::boolean, true),
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
$function$;