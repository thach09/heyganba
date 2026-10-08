-- Infrastructure only. No reminders or daily-plan UI are enabled.
CREATE TABLE user_learning_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_study_minutes INTEGER CHECK (daily_study_minutes BETWEEN 1 AND 1440),
    reminder_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_time TIME,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_reminder_time_required CHECK (NOT reminder_opt_in OR reminder_time IS NOT NULL)
);
