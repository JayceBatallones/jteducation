-- Auto-placement function for Phase 2
-- Places student in best-fit cohort based on availability overlap

CREATE OR REPLACE FUNCTION auto_place_student(
    p_student_id UUID,
    p_program_id UUID,
    p_user_timezone TEXT DEFAULT 'Australia/Melbourne'
)
RETURNS TABLE (
    success BOOLEAN,
    cohort_id UUID,
    cohort_name TEXT,
    waitlisted BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_availability JSONB;
    v_best_cohort_id UUID;
    v_best_cohort_name TEXT;
    v_best_score FLOAT := 0;
    v_cohort RECORD;
    v_event RECORD;
    v_overlap_count INT;
    v_total_event_slots INT;
    v_score FLOAT;
    v_enrolled_count INT;
    v_min_score_threshold FLOAT := 0.3; -- 30% minimum overlap required
BEGIN
    -- Get student's availability
    SELECT weekly_grid INTO v_availability
    FROM user_availability
    WHERE user_id = p_student_id;

    -- If no availability set, return error
    IF v_availability IS NULL THEN
        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            NULL::UUID,
            NULL::TEXT,
            FALSE::BOOLEAN,
            'Student has no availability set'::TEXT;
        RETURN;
    END IF;

    -- Check if student is already in a cohort for this program
    IF EXISTS (
        SELECT 1 FROM cohort_students cs
        JOIN cohorts c ON cs.cohort_id = c.id
        WHERE cs.student_id = p_student_id AND c.program_id = p_program_id
    ) THEN
        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            NULL::UUID,
            NULL::TEXT,
            FALSE::BOOLEAN,
            'Student is already enrolled in a cohort for this program'::TEXT;
        RETURN;
    END IF;

    -- Loop through cohorts for this program
    FOR v_cohort IN
        SELECT
            c.id,
            c.name,
            c.capacity,
            (SELECT COUNT(*) FROM cohort_students WHERE cohort_id = c.id) AS enrolled
        FROM cohorts c
        WHERE c.program_id = p_program_id
        -- Only consider cohorts that start within 4 weeks
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.cohort_id = c.id
            AND e.start_time >= NOW()
            AND e.start_time <= NOW() + INTERVAL '28 days'
        )
    LOOP
        -- Skip if cohort is full
        IF v_cohort.enrolled >= v_cohort.capacity THEN
            CONTINUE;
        END IF;

        -- Calculate overlap score
        v_overlap_count := 0;
        v_total_event_slots := 0;

        -- Check each content event in this cohort
        FOR v_event IN
            SELECT
                start_time AT TIME ZONE 'UTC' AT TIME ZONE p_user_timezone AS local_start,
                end_time AT TIME ZONE 'UTC' AT TIME ZONE p_user_timezone AS local_end
            FROM events
            WHERE cohort_id = v_cohort.id
            AND event_type = 'content'
            AND start_time >= NOW()
            LIMIT 10 -- Only check next 10 events
        LOOP
            v_total_event_slots := v_total_event_slots + 1;

            -- Check if student is available during this event
            -- Convert event time to day of week (0=Mon) and slot index
            DECLARE
                v_day_of_week INT;
                v_start_slot INT;
                v_hour INT;
                v_minute INT;
                v_is_available BOOLEAN;
            BEGIN
                -- Get day of week (1=Mon in PostgreSQL, we want 0=Mon)
                v_day_of_week := EXTRACT(ISODOW FROM v_event.local_start)::INT - 1;
                v_hour := EXTRACT(HOUR FROM v_event.local_start)::INT;
                v_minute := EXTRACT(MINUTE FROM v_event.local_start)::INT;

                -- Calculate slot index (6am start, 30min slots)
                IF v_hour >= 6 AND v_hour < 22 THEN
                    v_start_slot := ((v_hour - 6) * 2) + (v_minute / 30);

                    -- Check availability grid (JSONB array access)
                    v_is_available := (v_availability->v_day_of_week->v_start_slot)::BOOLEAN;

                    IF v_is_available THEN
                        v_overlap_count := v_overlap_count + 1;
                    END IF;
                END IF;
            END;
        END LOOP;

        -- Calculate score (overlap percentage)
        IF v_total_event_slots > 0 THEN
            v_score := v_overlap_count::FLOAT / v_total_event_slots::FLOAT;
        ELSE
            v_score := 0;
        END IF;

        -- Update best cohort if this one is better
        -- Tie-breaker: prefer less-full cohort
        IF v_score > v_best_score OR
           (v_score = v_best_score AND v_score > 0 AND v_cohort.enrolled < (SELECT COUNT(*) FROM cohort_students WHERE cohort_id = v_best_cohort_id))
        THEN
            v_best_score := v_score;
            v_best_cohort_id := v_cohort.id;
            v_best_cohort_name := v_cohort.name;
        END IF;
    END LOOP;

    -- If we found a suitable cohort with good overlap
    IF v_best_cohort_id IS NOT NULL AND v_best_score >= v_min_score_threshold THEN
        -- Enroll student in cohort (trigger will auto-enroll in content events)
        INSERT INTO cohort_students (cohort_id, student_id)
        VALUES (v_best_cohort_id, p_student_id);

        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            v_best_cohort_id,
            v_best_cohort_name,
            FALSE::BOOLEAN,
            FORMAT('Placed in %s with %.0f%% availability match', v_best_cohort_name, v_best_score * 100)::TEXT;
        RETURN;
    ELSE
        -- Add to waitlist
        INSERT INTO cohort_waitlist (user_id, program_id, notes)
        VALUES (
            p_student_id,
            p_program_id,
            FORMAT('Auto-placement failed. Best match: %.0f%% overlap', COALESCE(v_best_score * 100, 0))
        )
        ON CONFLICT (user_id, program_id) DO UPDATE
        SET notes = EXCLUDED.notes,
            waitlisted_at = NOW();

        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            NULL::UUID,
            NULL::TEXT,
            TRUE::BOOLEAN,
            'No suitable cohort found. Added to waitlist.'::TEXT;
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add program_id to waitlist table if not exists (for tracking which program they're waiting for)
ALTER TABLE cohort_waitlist
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id);

-- Add unique constraint for user per program waitlist
ALTER TABLE cohort_waitlist
DROP CONSTRAINT IF EXISTS cohort_waitlist_user_program_unique;

ALTER TABLE cohort_waitlist
ADD CONSTRAINT cohort_waitlist_user_program_unique UNIQUE (user_id, program_id);

-- Function to get placement suggestions for a student
CREATE OR REPLACE FUNCTION get_placement_suggestions(
    p_student_id UUID,
    p_program_id UUID
)
RETURNS TABLE (
    cohort_id UUID,
    cohort_name TEXT,
    cohort_color TEXT,
    enrolled INT,
    capacity INT,
    overlap_score FLOAT,
    next_event_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH student_availability AS (
        SELECT weekly_grid
        FROM user_availability
        WHERE user_id = p_student_id
    ),
    cohort_scores AS (
        SELECT
            c.id AS cohort_id,
            c.name AS cohort_name,
            c.color AS cohort_color,
            (SELECT COUNT(*)::INT FROM cohort_students WHERE cohort_id = c.id) AS enrolled,
            c.capacity::INT,
            0.5::FLOAT AS overlap_score, -- Simplified; in production would calculate actual overlap
            MIN(e.start_time) AS next_event_date
        FROM cohorts c
        LEFT JOIN events e ON e.cohort_id = c.id AND e.start_time >= NOW()
        WHERE c.program_id = p_program_id
        GROUP BY c.id, c.name, c.color, c.capacity
    )
    SELECT * FROM cohort_scores
    WHERE enrolled < capacity
    ORDER BY overlap_score DESC, enrolled ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
