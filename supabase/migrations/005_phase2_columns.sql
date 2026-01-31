-- Add columns needed for Phase 2 features

-- Reschedule requests: add admin response columns
ALTER TABLE reschedule_requests
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

-- Consult slots: add booking tracking columns
ALTER TABLE consult_slots
ADD COLUMN IF NOT EXISTS booked_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Create index for faster reschedule lookups
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_user ON reschedule_requests(user_id);

-- Create index for consult slots
CREATE INDEX IF NOT EXISTS idx_consult_slots_start_time ON consult_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_consult_slots_tutor ON consult_slots(tutor_id);
