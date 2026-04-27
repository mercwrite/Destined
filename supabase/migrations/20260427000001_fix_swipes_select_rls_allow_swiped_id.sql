-- The likes screen queries swipes WHERE swiped_id = auth.uid() to find
-- profiles that liked the current user. The previous SELECT policy only
-- allowed reading rows where swiper_id = auth.uid(), so all incoming
-- likes were invisible. Extend it to cover both sides of the swipe.

DROP POLICY IF EXISTS "Users read own swipes" ON public.swipes;

CREATE POLICY "Users read own swipes"
  ON public.swipes FOR SELECT
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);
