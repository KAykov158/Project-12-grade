-- Run this in your Supabase SQL editor to add missing columns
ALTER TABLE teams ADD COLUMN IF NOT EXISTS assistant_coaches JSONB DEFAULT '[]'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS card_photo TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';

-- Add lineup column to matches table (JSONB array of { submittedBy, starting[], substitutes[] })
ALTER TABLE matches ADD COLUMN IF NOT EXISTS lineup JSONB DEFAULT '[]'::jsonb;

-- Allow coaches to update matches they are involved in (for lineup submission)
CREATE POLICY "matches_update_coach" ON matches FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.coach_id = auth.uid()
    AND (teams.id = matches.home_team_id OR teams.id = matches.away_team_id)
  )
);

-- Sync Google profile photo on future sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, nickname, photo, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    COALESCE(NEW.raw_user_meta_data->>'photo', NEW.raw_user_meta_data->>'picture', NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'referee'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
