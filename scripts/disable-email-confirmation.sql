
-- Script to disable email confirmation for new user signups
-- This allows users to sign up without needing to confirm their email

-- For existing users who might be unconfirmed, you can manually confirm them:
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- Create a function to auto-confirm users on signup
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  -- Auto-confirm the user's email
  NEW.email_confirmed_at = NOW();
  NEW.email_change_confirm_status = 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;

-- Create trigger for auto-confirming users
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_confirm_user();

-- Also create a function to handle profile creation more reliably
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, location)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'location'
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the profile creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- NOTE: The main configuration needs to be done in Supabase Dashboard:
-- 1. Go to Authentication > Settings in your Supabase Dashboard
-- 2. Turn OFF "Enable email confirmations"
-- 3. Turn ON "Enable automatic confirmation" (if available)
--
-- Alternatively, you can set these environment variables in your Supabase project settings:
-- GOTRUE_MAILER_AUTOCONFIRM = true
-- GOTRUE_DISABLE_SIGNUP = false
-- GOTRUE_EXTERNAL_EMAIL_ENABLED = true

-- If you have access to your Supabase CLI, you can also run:
-- supabase secrets set GOTRUE_MAILER_AUTOCONFIRM=true
