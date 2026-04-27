-- Add messages table for chat functionality
-- Migration: 20260426120000_add_messages_table

-- RPC function for match creation (used in useSwipeQueue.ts)
CREATE OR REPLACE FUNCTION public.check_and_create_match(p_swiped_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_match_id uuid;
BEGIN
  -- Check if the swiped user has already swiped right on current user
  IF EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = p_swiped_id
    AND swiped_id = v_current_user_id
    AND direction = 'right'
  ) THEN
    -- Create match with canonical ordering
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (
      LEAST(v_current_user_id, p_swiped_id),
      GREATEST(v_current_user_id, p_swiped_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO v_match_id;

    RETURN v_match_id;
  END IF;

  RETURN NULL;
END;
$$;

-- messages table
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

-- Indexes for performance
CREATE INDEX messages_match_id_created_at_idx ON public.messages (match_id, created_at);
CREATE INDEX messages_sender_id_idx ON public.messages (sender_id);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can select messages only for matches they belong to
CREATE POLICY "Users can read messages in their matches"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- Users can insert messages only if sender_id = auth.uid() and they belong to the match
CREATE POLICY "Users can send messages in their matches"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- Users can update read_at for messages in matches they belong to
CREATE POLICY "Users can mark messages as read in their matches"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );