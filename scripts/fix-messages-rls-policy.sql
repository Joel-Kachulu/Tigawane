
-- Fix Messages RLS Policy
-- The current policy is causing insertions to fail

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert messages for their claims" ON messages;
DROP POLICY IF EXISTS "Users can view messages for their claims" ON messages;

-- Create more permissive policies
CREATE POLICY "Users can view messages in their claims" ON messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM claims c 
    WHERE c.id = messages.claim_id 
    AND (c.claimer_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can insert messages" ON messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IS NOT NULL
);

-- Grant necessary permissions
GRANT INSERT ON messages TO authenticated;
GRANT SELECT ON messages TO authenticated;
