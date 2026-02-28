-- Create enum for theme preference
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark');

-- Add theme preference to users
ALTER TABLE "users"
  ADD COLUMN "theme_preference" "ThemePreference" NOT NULL DEFAULT 'light';
