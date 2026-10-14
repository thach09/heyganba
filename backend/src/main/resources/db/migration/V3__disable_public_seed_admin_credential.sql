-- Security migration: Ensure default seed admin credential is not active with default password hash
UPDATE users
SET is_active = FALSE,
    token_version = token_version + 1
WHERE email = 'admin@heyganba.vn'
  AND password_hash = '$2a$10$lc2gbEBnoKI7XBTTQBOffePZpp5xTWeOPFAeLCc9rC.yr/ip9al6y';
