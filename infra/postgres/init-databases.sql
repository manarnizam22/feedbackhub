-- Keycloak gets its own database on the shared dev instance (ADR-0003).
-- The app database is created by the postgres image from POSTGRES_DB.
CREATE DATABASE keycloak;
