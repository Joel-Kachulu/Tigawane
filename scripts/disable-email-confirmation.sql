
-- Script to disable email confirmation for new user signups
-- This allows users to sign up without needing to confirm their email

-- Update auth configuration to disable email confirmation
UPDATE auth.config 
SET email_confirm_change_enabled = false,
    email_autoconfirm = true
WHERE id = 1;

-- If the above doesn't work (config table might not exist), 
-- you'll need to configure this in Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Turn OFF "Enable email confirmations"
-- 3. Turn ON "Enable automatic confirmation"

-- Alternatively, you can set these environment variables in your Supabase project:
-- GOTRUE_MAILER_AUTOCONFIRM = true
-- GOTRUE_DISABLE_SIGNUP = false

-- For existing users who might be unconfirmed, you can manually confirm them:
-- UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- Create a function to auto-confirm users on signup
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  -- Automatically confirm email when user signs up
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm users
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_confirm_user();
