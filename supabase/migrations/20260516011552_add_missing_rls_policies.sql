/*
  # Add missing RLS policies

  1. Security changes
    - Add INSERT policy for conversations (users can create conversations for their matches)
    - Add UPDATE policy for conversations (users can update their own conversations)
    - Add DELETE policy for matches (users can delete their own matches)
    - Add DELETE policy for messages (users can delete their own messages)
    - Add index on messages.conversation_id for performance
    - Add index on travel_plans.destination for search performance
    - Add index on profiles.is_onboarded for filtering
*/

-- Conversations: INSERT policy
CREATE POLICY "Users can create conversations for own matches"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = conversations.match_id
      AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
    )
  );

-- Conversations: UPDATE policy
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = conversations.match_id
      AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
    )
  );

-- Matches: DELETE policy
CREATE POLICY "Users can delete own matches"
  ON matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Messages: DELETE policy
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_plans_destination ON travel_plans USING gin(to_tsvector('english', destination));
CREATE INDEX IF NOT EXISTS idx_travel_plans_user_id ON travel_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarded ON profiles(is_onboarded) WHERE is_onboarded = true;
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;
