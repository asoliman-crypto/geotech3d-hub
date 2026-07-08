# Going Live — Supabase setup (Phase 2, your part)

This is what YOU do so the team can work live on shared data. ~5 minutes.

## 1. Create a free Supabase project
1. Go to https://supabase.com → sign up / log in.
2. **New project** → name it `geotech3d-hub` → set a strong database password → pick the closest region (e.g. Frankfurt / Middle East) → Create.
3. Wait ~2 min for it to provision.

## 2. Run the database schema
1. In the project, open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` → **Run**.
3. You should see "Success". (It creates the tables, realtime, and access rules.)

## 3. Send me two values (safe to share — they are public keys)
From **Project Settings → API**:
- **Project URL**  (looks like `https://xxxxxxxx.supabase.co`)
- **anon public** key  (the long `anon` key, NOT the `service_role` secret)

> Do NOT send the `service_role` secret or the database password.

## 4. (Optional) Team accounts
Tell me the list of people who should have real logins (name + email + role), and I'll help create them in **Authentication → Users**, or set up an invite flow.

---

Once I have the URL + anon key, I will:
- add the Supabase client to the app,
- replace the localStorage data layer with live Supabase reads/writes + realtime,
- wire real login,
- and deploy it to a URL for the team.
