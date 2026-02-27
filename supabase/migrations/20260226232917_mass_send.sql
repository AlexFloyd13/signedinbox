ALTER TABLE signedinbox_stamps
  ADD COLUMN IF NOT EXISTS is_mass_send BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declared_recipient_count INTEGER;
