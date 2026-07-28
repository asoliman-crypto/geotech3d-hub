// Creates the two portfolio monitoring accounts (GM + PM) in Supabase.
//
// These accounts only ever see the Portfolio Status board:
//   gm.portfolio -> read only
//   pm.portfolio -> can move a project between pipeline / current / historical
//
// Run it once, from the projects-hub folder, with your service_role key:
//
//   PowerShell:
//     $env:SUPABASE_URL="https://fsxxmaehyletvkxdzyif.supabase.co"
//     $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key from Supabase>"
//     node scripts/add-portfolio-accounts.mjs
//
//   Git Bash:
//     SUPABASE_URL="https://fsxxmaehyletvkxdzyif.supabase.co" \
//     SUPABASE_SERVICE_ROLE_KEY="<service_role key>" \
//     node scripts/add-portfolio-accounts.mjs
//
// Get the key from: Supabase dashboard -> Project Settings -> API -> service_role.
// It is safe to run more than once: existing accounts are updated, not duplicated.

import { createClient } from "@supabase/supabase-js";
import { teamUsers, sanitizeUser } from "../src/auth/authData.js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD || "Geo@123456";

if (!url || !serviceKey) {
  console.error(
    "\nMissing credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then re-run.\n" +
      "The service_role key is in: Supabase dashboard -> Project Settings -> API.\n",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PORTFOLIO_USERNAMES = ["gm.portfolio", "pm.portfolio"];
const accounts = teamUsers.filter((user) => PORTFOLIO_USERNAMES.includes(user.username));

if (accounts.length !== PORTFOLIO_USERNAMES.length) {
  console.error("Could not find both portfolio accounts in authData.js — aborting.");
  process.exit(1);
}

async function findExistingUser(email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const match = data.users.find((user) => (user.email || "").toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}

let created = 0;
let updated = 0;

for (const account of accounts) {
  const existing = await findExistingUser(account.email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { name: account.name, role: account.role, username: account.username },
    });
    if (error) {
      console.error(`  x updateUser ${account.email}: ${error.message}`);
      continue;
    }
    updated += 1;
    console.log(`  = updated auth user ${account.email}`);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { name: account.name, role: account.role, username: account.username },
    });
    if (error) {
      console.error(`  x createUser ${account.email}: ${error.message}`);
      continue;
    }
    created += 1;
    console.log(`  + created auth user ${account.email}`);
  }
}

// The app reads the roster from `profiles`, so both rows must exist there too.
const profileRows = accounts.map((account) => ({
  id: account.id,
  data: sanitizeUser(account),
}));

const { error: profileError } = await admin.from("profiles").upsert(profileRows);
if (profileError) {
  console.error(`\nx profiles upsert failed: ${profileError.message}`);
  process.exit(1);
}

console.log(
  `\nDone. auth users: ${created} created, ${updated} updated. profiles: ${profileRows.length} upserted.`,
);
console.log("\nSign in with:");
for (const account of accounts) {
  console.log(`  ${account.username.padEnd(14)} / ${password}   (${account.badge})`);
}
