-- Run this in your Supabase SQL editor to add missing columns
ALTER TABLE teams ADD COLUMN IF NOT EXISTS assistant_coaches JSONB DEFAULT '[]'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS card_photo TEXT DEFAULT '';
