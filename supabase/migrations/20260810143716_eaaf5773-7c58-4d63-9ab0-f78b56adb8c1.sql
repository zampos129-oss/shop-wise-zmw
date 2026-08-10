CREATE OR REPLACE FUNCTION public.touch_business_sync(_business_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ts timestamptz;
BEGIN
  IF _business_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_business_member(_business_id) THEN
    RETURN NULL;
  END IF;

  UPDATE public.businesses
  SET last_sync_at = now()
  WHERE id = _business_id
  RETURNING last_sync_at INTO v_ts;

  RETURN v_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_business_sync(uuid) TO authenticated;