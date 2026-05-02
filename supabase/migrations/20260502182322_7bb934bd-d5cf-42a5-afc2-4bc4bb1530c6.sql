
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.lock_submitted_eval() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
-- has_role must remain executable by authenticated for RLS subqueries
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
