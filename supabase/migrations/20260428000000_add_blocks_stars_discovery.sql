-- Migration: blocked_users table, match starring, user_settings extensions, delete_account RPC
-- 20260428000000

-- ── Blocked users ──────────────────────────────────────────────────────────────

CREATE TABLE public.blocked_users (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON public.blocked_users FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON public.blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can remove their own blocks"
  ON public.blocked_users FOR DELETE
  USING (blocker_id = auth.uid());

-- ── Match starring ─────────────────────────────────────────────────────────────

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS starred_by_user1 boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS starred_by_user2 boolean DEFAULT false NOT NULL;

-- Allow users to star/unstar their own matches
DROP POLICY IF EXISTS "Users can update match starred status" ON public.matches;
CREATE POLICY "Users can update match starred status"
  ON public.matches FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid())
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- Allow users to delete (unmatch) their matches
DROP POLICY IF EXISTS "Users can delete their matches" ON public.matches;
CREATE POLICY "Users can delete their matches"
  ON public.matches FOR DELETE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- ── User settings extensions ───────────────────────────────────────────────────

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS discoverable boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS is_active    boolean DEFAULT true NOT NULL;

-- ── Delete account RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.blocked_users
    WHERE blocker_id = v_uid OR blocked_id = v_uid;

  -- Delete messages in the user's matches before deleting the matches themselves
  DELETE FROM public.messages
    WHERE match_id IN (
      SELECT id FROM public.matches
      WHERE user1_id = v_uid OR user2_id = v_uid
    );

  DELETE FROM public.matches
    WHERE user1_id = v_uid OR user2_id = v_uid;

  DELETE FROM public.swipes
    WHERE swiper_id = v_uid OR swiped_id = v_uid;

  DELETE FROM public.user_settings WHERE id = v_uid;

  DELETE FROM public.profiles WHERE id = v_uid;

  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
