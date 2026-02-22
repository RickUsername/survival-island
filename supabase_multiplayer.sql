-- ============================================
-- Multiplayer-System: Supabase-Tabellen
-- Dieses SQL im Supabase SQL Editor ausfuehren!
-- ============================================

-- 1. Freundschaften
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id),
  user_b UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users can insert friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Users can update own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- 2. Nachrichten
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can mark as read" ON messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- 3. Besuchs-Sessions
CREATE TABLE visit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id),
  visitor_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  host_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE visit_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own visits" ON visit_sessions
  FOR SELECT USING (auth.uid() = host_id OR auth.uid() = visitor_id);
CREATE POLICY "Users can create visit requests" ON visit_sessions
  FOR INSERT WITH CHECK (auth.uid() = visitor_id);
CREATE POLICY "Users can update own visits" ON visit_sessions
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = visitor_id);

-- 4. Trades
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES visit_sessions(id),
  initiator_id UUID NOT NULL REFERENCES auth.users(id),
  partner_id UUID NOT NULL REFERENCES auth.users(id),
  initiator_items JSONB DEFAULT '[]',
  partner_items JSONB DEFAULT '[]',
  initiator_confirmed BOOLEAN DEFAULT false,
  partner_confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'negotiating',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = partner_id);
CREATE POLICY "Users can create trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = initiator_id OR auth.uid() = partner_id);

-- 5. Benutzername-Suche (SECURITY DEFINER = darf auth.users lesen)
CREATE OR REPLACE FUNCTION find_user_by_username(search_username TEXT)
RETURNS TABLE (id UUID, username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.raw_user_meta_data->>'username' as username
  FROM auth.users au
  WHERE lower(au.raw_user_meta_data->>'username') = lower(search_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Username per User-ID finden
CREATE OR REPLACE FUNCTION find_username_by_id(target_user_id UUID)
RETURNS TABLE (id UUID, username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.raw_user_meta_data->>'username' as username
  FROM auth.users au
  WHERE au.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Mehrere Usernames per User-IDs finden (Batch)
CREATE OR REPLACE FUNCTION find_usernames_by_ids(user_ids UUID[])
RETURNS TABLE (id UUID, username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.raw_user_meta_data->>'username' as username
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Realtime aktivieren fuer messages (fuer Live-Chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
