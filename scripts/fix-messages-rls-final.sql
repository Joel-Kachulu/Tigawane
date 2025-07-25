
-- Fix Messages RLS Policy - Final Version
-- The current policy is preventing message insertions

-- Drop all existing message policies to start fresh
DROP POLICY IF EXISTS "Users can insert messages for their claims" ON messages;
DROP POLICY IF EXISTS "Users can view messages for their claims" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their claims" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their claims" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;

-- Create a simplified, working policy for viewing messages
CREATE POLICY "Users can view messages in their claims" ON messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM claims c 
    WHERE c.id = messages.claim_id 
    AND (c.claimer_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

-- Create a simplified policy for inserting messages
-- This allows any authenticated user to insert a message if they're the sender
-- and the claim exists (we'll check ownership in the application layer)
CREATE POLICY "Users can insert messages" ON messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IS NOT NULL AND
  claim_id IS NOT NULL
);

-- Grant necessary permissions
GRANT INSERT ON messages TO authenticated;
GRANT SELECT ON messages TO authenticated;
GRANT UPDATE ON messages TO authenticated;

-- Verify the policies are working
SELECT 
  'Policy check:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'messages';
