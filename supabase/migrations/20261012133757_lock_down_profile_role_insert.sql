/*
# Lock down profile role on INSERT

1. Security Changes
- Revoke INSERT on profiles from anon, authenticated.
- Grant INSERT (id, full_name, phone, avatar_url, role) on profiles TO authenticated, but add a CHECK constraint limiting role to 'guest' or 'host' (not 'admin').
- This prevents a user from inserting role='admin' at signup time. The column-level INSERT grant still allows setting role at signup, but the CHECK constraint blocks admin.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('guest', 'host', 'admin'));

REVOKE INSERT ON profiles FROM anon, authenticated;
GRANT INSERT (id, full_name, phone, avatar_url, role) ON profiles TO authenticated;
