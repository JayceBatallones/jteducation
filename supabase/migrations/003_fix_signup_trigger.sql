-- Fix the handle_new_user trigger to include full_name and set proper status
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role, status, timezone)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
        'pending_customer',  -- Self-signup starts as pending (needs admin verification or payment)
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'Australia/Melbourne')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger itself already exists, we just replaced the function
