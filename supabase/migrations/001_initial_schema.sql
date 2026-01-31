-- JT Education Database Schema
-- Phase 1: Core Foundation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('parent', 'student', 'tutor', 'admin');
CREATE TYPE user_status AS ENUM ('pending_customer', 'customer', 'inactive_customer');
CREATE TYPE event_type AS ENUM ('content', 'applied', 'drop-in', 'consult');
CREATE TYPE attendance_status AS ENUM ('attending', 'not_attending');
CREATE TYPE reschedule_status AS ENUM ('pending', 'approved', 'denied');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs (e.g., JMSS-Y10, JMSS-Y11)
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cohorts (e.g., JMSS-Y10-1)
CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10,
    stable_meet_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id, name)
);

-- Cohort tutors (many-to-many)
CREATE TABLE cohort_tutors (
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cohort_id, tutor_id)
);

-- Cohort students (enrollment)
CREATE TABLE cohort_students (
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cohort_id, student_id)
);

-- Events (content, applied, drop-in, consult)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type event_type NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    capacity INTEGER, -- NULL = unlimited
    recurrence_pattern JSONB, -- {day: 'monday', time: '17:00', freq: 'weekly'}
    recurrence_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_has_cohort_or_program CHECK (
        (cohort_id IS NOT NULL AND program_id IS NULL) OR
        (cohort_id IS NULL AND program_id IS NOT NULL) OR
        (event_type = 'consult' AND cohort_id IS NULL AND program_id IS NULL)
    )
);

-- Event bookings
CREATE TABLE event_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status attendance_status, -- NULL = not marked yet
    marked_by UUID REFERENCES profiles(id),
    marked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Parent-student links
CREATE TABLE parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- User status history (audit log)
CREATE TABLE user_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    old_status user_status,
    new_status user_status NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User plan (subscription tracking)
CREATE TABLE user_plan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT NOT NULL,
    max_hours NUMERIC NOT NULL,
    booked_hours NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User availability (when2meet grid)
CREATE TABLE user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    availability JSONB NOT NULL DEFAULT '{"weekly_grid": [], "date_overrides": {}}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cohort waitlist
CREATE TABLE cohort_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    waitlisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    UNIQUE(user_id, cohort_id)
);

-- Reschedule requests
CREATE TABLE reschedule_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    status reschedule_status NOT NULL DEFAULT 'pending'
);

-- Consult slots
CREATE TABLE consult_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Not attending tokens (for email links)
CREATE TABLE not_attending_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    email_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_24h BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_1h BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_cohorts_program ON cohorts(program_id);
CREATE INDEX idx_events_cohort ON events(cohort_id);
CREATE INDEX idx_events_program ON events(program_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_event_bookings_user ON event_bookings(user_id);
CREATE INDEX idx_event_bookings_event ON event_bookings(event_id);
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_cohort_students_student ON cohort_students(student_id);
CREATE INDEX idx_parent_student_links_parent ON parent_student_links(parent_id);
CREATE INDEX idx_parent_student_links_student ON parent_student_links(student_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_availability_updated_at
    BEFORE UPDATE ON user_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO user_status_history (user_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_status_change
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
        'customer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to create attendance record when booking is created
CREATE OR REPLACE FUNCTION create_attendance_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO attendance (user_id, event_id, status)
    VALUES (NEW.user_id, NEW.event_id, NULL)
    ON CONFLICT (user_id, event_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_creates_attendance
    AFTER INSERT ON event_bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_attendance_on_booking();

-- Function to auto-enroll students in Content events when assigned to cohort
CREATE OR REPLACE FUNCTION enroll_student_in_content_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Create bookings for all content events in the cohort
    INSERT INTO event_bookings (user_id, event_id)
    SELECT NEW.student_id, e.id
    FROM events e
    WHERE e.cohort_id = NEW.cohort_id
    AND e.event_type = 'content'
    AND e.is_required = TRUE
    ON CONFLICT (user_id, event_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cohort_enrollment_content_events
    AFTER INSERT ON cohort_students
    FOR EACH ROW
    EXECUTE FUNCTION enroll_student_in_content_events();

-- Function to auto-enroll all program students in drop-in events
CREATE OR REPLACE FUNCTION enroll_program_students_in_dropin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'drop-in' AND NEW.program_id IS NOT NULL THEN
        -- Create bookings for all students in cohorts of this program
        INSERT INTO event_bookings (user_id, event_id)
        SELECT DISTINCT cs.student_id, NEW.id
        FROM cohort_students cs
        JOIN cohorts c ON cs.cohort_id = c.id
        WHERE c.program_id = NEW.program_id
        ON CONFLICT (user_id, event_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dropin_event_enrollment
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION enroll_program_students_in_dropin();
