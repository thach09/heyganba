-- Run with psql as the migration owner on the intended database.
-- Required psql variables: app_role, app_password, migration_role.
-- Supply secrets through your secret manager; never commit a filled-in copy.
\set ON_ERROR_STOP on
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'app_role', :'app_password')
WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=:'app_role') \gexec
ALTER ROLE :"app_role" NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_role') \gexec
GRANT USAGE ON SCHEMA public TO :"app_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO :"app_role";
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO :"app_role";
REVOKE CREATE ON SCHEMA public FROM :"app_role";
