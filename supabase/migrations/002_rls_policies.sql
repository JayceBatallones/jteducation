-- Row Level Security Policies
-- Enable RLS on all tables

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE not_attending_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is linked parent
CREATE OR REPLACE FUNCTION is_linked_parent(parent_id UUID, student_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM parent_student_links
        WHERE parent_student_links.parent_id = is_linked_parent.parent_id
        AND parent_student_links.student_id = is_linked_parent.student_id
    );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if tutor is assigned to cohort
CREATE OR REPLACE FUNCTION is_cohort_tutor(tutor_id UUID, cohort_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM cohort_tutors
        WHERE cohort_tutors.tutor_id = is_cohort_tutor.tutor_id
        AND cohort_tutors.cohort_id = is_cohort_tutor.cohort_id
    );
$$ LANGUAGE SQL SECURITY DEFINER;

-- PROFILES POLICIES
-- Everyone can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Parents can read linked students' profiles
CREATE POLICY "Parents can read linked students"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM parent_student_links
            WHERE parent_student_links.parent_id = auth.uid()
            AND parent_student_links.student_id = profiles.id
        )
    );

-- Tutors can read students in their cohorts
CREATE POLICY "Tutors can read cohort students"
    ON profiles FOR SELECT
    USING (
        get_user_role(auth.uid()) = 'tutor'
        AND EXISTS (
            SELECT 1 FROM cohort_students cs
            JOIN cohort_tutors ct ON cs.cohort_id = ct.cohort_id
            WHERE ct.tutor_id = auth.uid()
            AND cs.student_id = profiles.id
        )
    );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (get_user_role(auth.uid()) = 'admin');

-- Users can update own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (get_user_role(auth.uid()) = 'admin');

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- PROGRAMS POLICIES
-- Everyone can read programs
CREATE POLICY "Everyone can read programs"
    ON programs FOR SELECT
    USING (TRUE);

-- Only admins can modify programs
CREATE POLICY "Admins can manage programs"
    ON programs FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- COHORTS POLICIES
-- Everyone can read cohorts
CREATE POLICY "Everyone can read cohorts"
    ON cohorts FOR SELECT
    USING (TRUE);

-- Only admins can modify cohorts
CREATE POLICY "Admins can manage cohorts"
    ON cohorts FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- COHORT_TUTORS POLICIES
-- Everyone can read cohort tutors
CREATE POLICY "Everyone can read cohort tutors"
    ON cohort_tutors FOR SELECT
    USING (TRUE);

-- Only admins can modify
CREATE POLICY "Admins can manage cohort tutors"
    ON cohort_tutors FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- COHORT_STUDENTS POLICIES
-- Students can see their own enrollments
CREATE POLICY "Students can read own enrollment"
    ON cohort_students FOR SELECT
    USING (student_id = auth.uid());

-- Parents can see linked students' enrollments
CREATE POLICY "Parents can read linked student enrollment"
    ON cohort_students FOR SELECT
    USING (is_linked_parent(auth.uid(), student_id));

-- Tutors can see enrollments in their cohorts
CREATE POLICY "Tutors can read cohort enrollments"
    ON cohort_students FOR SELECT
    USING (is_cohort_tutor(auth.uid(), cohort_id));

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage cohort students"
    ON cohort_students FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- EVENTS POLICIES
-- Everyone can read events they're related to
CREATE POLICY "Users can read related events"
    ON events FOR SELECT
    USING (
        -- Cohort events: user is enrolled in cohort
        (cohort_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM cohort_students
            WHERE cohort_students.cohort_id = events.cohort_id
            AND cohort_students.student_id = auth.uid()
        ))
        -- Or parent of enrolled student
        OR (cohort_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM cohort_students cs
            JOIN parent_student_links psl ON cs.student_id = psl.student_id
            WHERE cs.cohort_id = events.cohort_id
            AND psl.parent_id = auth.uid()
        ))
        -- Drop-in events: user is in a cohort of the program
        OR (program_id IS NOT NULL AND event_type = 'drop-in' AND EXISTS (
            SELECT 1 FROM cohort_students cs
            JOIN cohorts c ON cs.cohort_id = c.id
            WHERE c.program_id = events.program_id
            AND cs.student_id = auth.uid()
        ))
        -- Tutors can see events for their cohorts
        OR (cohort_id IS NOT NULL AND is_cohort_tutor(auth.uid(), cohort_id))
        -- Admins can see all
        OR get_user_role(auth.uid()) = 'admin'
    );

-- Tutors can update event times (move events)
CREATE POLICY "Tutors can update event times"
    ON events FOR UPDATE
    USING (is_cohort_tutor(auth.uid(), cohort_id))
    WITH CHECK (is_cohort_tutor(auth.uid(), cohort_id));

-- Admins can manage all events
CREATE POLICY "Admins can manage events"
    ON events FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- EVENT_BOOKINGS POLICIES
-- Users can read their own bookings
CREATE POLICY "Users can read own bookings"
    ON event_bookings FOR SELECT
    USING (user_id = auth.uid());

-- Parents can read linked students' bookings
CREATE POLICY "Parents can read linked student bookings"
    ON event_bookings FOR SELECT
    USING (is_linked_parent(auth.uid(), user_id));

-- Tutors can read bookings for their events
CREATE POLICY "Tutors can read cohort bookings"
    ON event_bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_bookings.event_id
            AND is_cohort_tutor(auth.uid(), e.cohort_id)
        )
    );

-- Users can create bookings for Applied events
CREATE POLICY "Users can create applied bookings"
    ON event_bookings FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_bookings.event_id
            AND e.event_type = 'applied'
        )
    );

-- Users can delete their own Applied bookings
CREATE POLICY "Users can delete applied bookings"
    ON event_bookings FOR DELETE
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_bookings.event_id
            AND e.event_type = 'applied'
        )
    );

-- Admins can manage all bookings
CREATE POLICY "Admins can manage bookings"
    ON event_bookings FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- ATTENDANCE POLICIES
-- Users can read their own attendance
CREATE POLICY "Users can read own attendance"
    ON attendance FOR SELECT
    USING (user_id = auth.uid());

-- Parents can read linked students' attendance
CREATE POLICY "Parents can read linked student attendance"
    ON attendance FOR SELECT
    USING (is_linked_parent(auth.uid(), user_id));

-- Tutors can read/update attendance for their cohorts
CREATE POLICY "Tutors can read cohort attendance"
    ON attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = attendance.event_id
            AND is_cohort_tutor(auth.uid(), e.cohort_id)
        )
    );

CREATE POLICY "Tutors can update cohort attendance"
    ON attendance FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = attendance.event_id
            AND is_cohort_tutor(auth.uid(), e.cohort_id)
        )
    );

-- Admins can manage all attendance
CREATE POLICY "Admins can manage attendance"
    ON attendance FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- PARENT_STUDENT_LINKS POLICIES
-- Users can see their own links
CREATE POLICY "Users can read own links"
    ON parent_student_links FOR SELECT
    USING (parent_id = auth.uid() OR student_id = auth.uid());

-- Admins can manage links
CREATE POLICY "Admins can manage links"
    ON parent_student_links FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- USER_STATUS_HISTORY POLICIES
-- Users can read their own history
CREATE POLICY "Users can read own status history"
    ON user_status_history FOR SELECT
    USING (user_id = auth.uid());

-- Admins can read all history
CREATE POLICY "Admins can read all status history"
    ON user_status_history FOR SELECT
    USING (get_user_role(auth.uid()) = 'admin');

-- USER_PLAN POLICIES
-- Users can read their own plan
CREATE POLICY "Users can read own plan"
    ON user_plan FOR SELECT
    USING (user_id = auth.uid());

-- Parents can read linked students' plans
CREATE POLICY "Parents can read linked student plan"
    ON user_plan FOR SELECT
    USING (is_linked_parent(auth.uid(), user_id));

-- Admins can manage all plans
CREATE POLICY "Admins can manage plans"
    ON user_plan FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- USER_AVAILABILITY POLICIES
-- Users can read/update their own availability
CREATE POLICY "Users can manage own availability"
    ON user_availability FOR ALL
    USING (user_id = auth.uid());

-- Tutors and admins can read all availability (for scheduling)
CREATE POLICY "Tutors can read all availability"
    ON user_availability FOR SELECT
    USING (get_user_role(auth.uid()) IN ('tutor', 'admin'));

-- Admins can manage all availability
CREATE POLICY "Admins can manage availability"
    ON user_availability FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- COHORT_WAITLIST POLICIES
-- Users can see their own waitlist entries
CREATE POLICY "Users can read own waitlist"
    ON cohort_waitlist FOR SELECT
    USING (user_id = auth.uid());

-- Admins can manage waitlist
CREATE POLICY "Admins can manage waitlist"
    ON cohort_waitlist FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- RESCHEDULE_REQUESTS POLICIES
-- Users can read/create their own requests
CREATE POLICY "Users can read own reschedule requests"
    ON reschedule_requests FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create reschedule requests"
    ON reschedule_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Tutors can read requests for their cohorts
CREATE POLICY "Tutors can read cohort reschedule requests"
    ON reschedule_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = reschedule_requests.event_id
            AND is_cohort_tutor(auth.uid(), e.cohort_id)
        )
    );

-- Admins can manage all requests
CREATE POLICY "Admins can manage reschedule requests"
    ON reschedule_requests FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- CONSULT_SLOTS POLICIES
-- Everyone can read available consult slots
CREATE POLICY "Everyone can read consult slots"
    ON consult_slots FOR SELECT
    USING (TRUE);

-- Tutors can manage their own slots
CREATE POLICY "Tutors can manage own consult slots"
    ON consult_slots FOR ALL
    USING (tutor_id = auth.uid());

-- Admins can manage all slots
CREATE POLICY "Admins can manage consult slots"
    ON consult_slots FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- NOT_ATTENDING_TOKENS POLICIES
-- Only the user can read their own tokens
CREATE POLICY "Users can read own tokens"
    ON not_attending_tokens FOR SELECT
    USING (user_id = auth.uid());

-- System creates tokens (via service role)
CREATE POLICY "Admins can manage tokens"
    ON not_attending_tokens FOR ALL
    USING (get_user_role(auth.uid()) = 'admin');

-- NOTIFICATION_PREFERENCES POLICIES
-- Users can manage their own preferences
CREATE POLICY "Users can manage own notification preferences"
    ON notification_preferences FOR ALL
    USING (user_id = auth.uid());

-- Admins can read all preferences
CREATE POLICY "Admins can read notification preferences"
    ON notification_preferences FOR SELECT
    USING (get_user_role(auth.uid()) = 'admin');
