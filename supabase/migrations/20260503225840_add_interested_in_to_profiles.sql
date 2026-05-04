-- Add interested_in column to profiles for storing who the user is interested in dating.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interested_in TEXT;
