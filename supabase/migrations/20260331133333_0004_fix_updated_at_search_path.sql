-- Fix: set immutable search_path on update_updated_at_column
-- Resolves Supabase security advisory: function_search_path_mutable
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;;
