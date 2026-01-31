-- Add Google Calendar integration columns

-- Add google_event_id to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);

-- Add stable_meet_link to cohorts if not exists
ALTER TABLE cohorts
ADD COLUMN IF NOT EXISTS stable_meet_link TEXT;
