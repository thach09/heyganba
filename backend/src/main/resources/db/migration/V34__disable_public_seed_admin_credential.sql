-- V2 is immutable Flyway history and contains a publicly documented sample credential.
-- Disable only accounts retaining that exact sample hash. Changed credentials are untouched.
-- Fresh installations must provision a private admin credential through their DB owner.
UPDATE users
SET is_active = FALSE, token_version = token_version + 1
WHERE email = 'admin@heyganba.vn'
  AND password_hash = '$2a$10$lc2gbEBnoKI7XBTTQBOffePZpp5xTWeOPFAeLCc9rC.yr/ip9al6y'
  AND is_active = TRUE;
