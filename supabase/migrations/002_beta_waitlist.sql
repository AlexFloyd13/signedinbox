-- Beta Waitlist
CREATE TABLE IF NOT EXISTS beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE beta_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (no auth needed to join the waitlist)
CREATE POLICY "Public can join waitlist" ON beta_waitlist
  FOR INSERT WITH CHECK (true);

-- Only authenticated users (you) can read the list
CREATE POLICY "Auth users can view waitlist" ON beta_waitlist
  FOR SELECT USING (auth.role() = 'authenticated');
