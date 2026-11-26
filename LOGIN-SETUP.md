# Login setup (about 15 minutes, once)

The site opens without a login until `config.js` is filled in. Nothing secret goes in this repository.

## 1. Create the Supabase project
1. Sign up free at supabase.com, then **New project** (any name, any region, choose a strong database password and keep it somewhere private).
2. **Authentication > Providers > Email**: turn **Confirm email** OFF, and turn **Allow new users to sign up** OFF (only you create users). Save.
3. **SQL Editor > New query**: paste all of `supabase/setup.sql`, press **Run**.
4. **SQL Editor > New query**: paste the separate `create-users.sql` (given to you privately, it holds the starting passwords and is never committed), press **Run**.
5. **Project Settings > API**: copy the **Project URL** and the **anon public** key. Never use the `service_role` key.

## 2. Email alerts to the administrator (EmailJS, free)
1. Sign up at emailjs.com, **Email Services > Add service** (Gmail), connect `sarkishbayter112233@gmail.com`.
2. **Email Templates > Create**: To email = `{{to_email}}`. Subject: `Password request from {{user_name}}`. Body: `{{user_name}} asked for a new password at {{requested_at}}. Approve or reject here: {{admin_link}}`.
3. **Account > General**: copy the **Public key**. In the service/security settings restrict allowed domains to `sarkishbayter.github.io`.

## 3. Fill in `config.js`
Put the Supabase URL and anon key, plus the EmailJS service ID, template ID and public key, then commit. From then on the login is active.

## Daily use
- Users sign in with their full name and password (the name is not case sensitive).
- Forgot password: the user sends a request, the administrator gets an email and finds it under **Admin > Password requests**. After **Approve** the user's waiting screen lets them choose a new password. After **Reject** it shows "Your request was rejected by the administrator."
- Passwords are stored encrypted (bcrypt) in Supabase and are never visible to anyone, including the administrator.
