-- Replace three separate client calls (swipe insert, photo stats update,
-- check_and_create_match) with one atomic SECURITY DEFINER function.
-- Fixes:
--   1. Swipe inserts never firing (missing .then()/.await on client)
--   2. Photo stats blocked by RLS (can't UPDATE another user's profile_photos row)
--   3. Race condition: client was reading stale counts instead of using SQL increments

CREATE OR REPLACE FUNCTION public.record_swipe(
  p_swiped_id uuid,
  p_direction text,
  p_photo_id  uuid DEFAULT NULL
)
RETURNS uuid   -- match_id if a new match was created, NULL otherwise
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_swiper_id uuid := auth.uid();
  v_match_id  uuid;
BEGIN
  IF p_direction NOT IN ('left', 'right') THEN
    RAISE EXCEPTION 'Invalid swipe direction: %', p_direction;
  END IF;

  -- Record the swipe
  INSERT INTO public.swipes (swiper_id, swiped_id, direction)
  VALUES (v_swiper_id, p_swiped_id, p_direction);

  -- Atomically increment photo stats (bypasses RLS so we can update any photo)
  IF p_photo_id IS NOT NULL THEN
    UPDATE public.profile_photos
    SET
      impressions = impressions + 1,
      swipe_right = CASE WHEN p_direction = 'right' THEN swipe_right + 1 ELSE swipe_right END,
      swipe_left  = CASE WHEN p_direction = 'left'  THEN swipe_left  + 1 ELSE swipe_left  END
    WHERE id = p_photo_id;
  END IF;

  -- Check for mutual right-swipe and create match
  IF p_direction = 'right' THEN
    IF EXISTS (
      SELECT 1 FROM public.swipes
      WHERE swiper_id = p_swiped_id
        AND swiped_id = v_swiper_id
        AND direction = 'right'
    ) THEN
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (
        LEAST(v_swiper_id, p_swiped_id),
        GREATEST(v_swiper_id, p_swiped_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING
      RETURNING id INTO v_match_id;
    END IF;
  END IF;

  RETURN v_match_id;
END;
$$;
