// ============================================================================
// Seed the shared Supabase backend for GEOTECH 3D / GEOSPATIAL HUB.
//
// It creates a real Supabase Auth login for every team account, inserts the
// matching `profiles` rows, and loads the starter projects/tasks so the live
// workspace opens with real data. Safe to re-run (idempotent upserts).
//
// Usage (PowerShell):
//   $env:SUPABASE_URL="https://xxxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
//   npm run seed
//
// The SERVICE ROLE key is a SECRET admin key — only use it here on your machine,
// never in the frontend or in git.
// ============================================================================
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { sanitizeUser, teamUsers } from "../src/auth/authData.js";
import {
  starterDailyBaseline,
  starterProjects,
  starterTasks,
} from "../src/data/demoData.js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "Geo@123456";

if (!url || !serviceKey) {
  console.error(
    "\n  Missing env vars. Set both before running:\n" +
      '    $env:SUPABASE_URL="https://<ref>.supabase.co"\n' +
      '    $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"\n',
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllAuthUsers() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) map.set(String(u.email || "").toLowerCase(), u.id);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return map;
}

function dedupeById(rows) {
  const map = new Map();
  for (const row of rows) map.set(row.id, row);
  return [...map.values()];
}

async function main() {
  console.log("→ Connecting to", url);
  const existing = await listAllAuthUsers();

  const profiles = [];
  const credentials = [];
  let created = 0;
  let reused = 0;

  for (const user of teamUsers) {
    const email = String(user.email || "").toLowerCase();
    if (!email) continue;

    let authId = existing.get(email);
    const password = user.password || DEFAULT_PASSWORD;

    if (!authId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: user.name, app_id: user.id },
      });
      if (error) {
        console.error(`  ✗ createUser ${email}: ${error.message}`);
        continue;
      }
      authId = data.user.id;
      existing.set(email, authId);
      created += 1;
      credentials.push({ name: user.name, email, username: user.username, role: user.role, password });
    } else {
      reused += 1;
      credentials.push({
        name: user.name,
        email,
        username: user.username,
        role: user.role,
        password: "(existing — unchanged)",
      });
    }

    profiles.push({
      id: user.id,
      auth_user_id: authId,
      email,
      role: user.role,
      data: sanitizeUser(user),
    });
  }

  console.log(`  auth users: ${created} created, ${reused} already existed`);

  const { error: pErr } = await admin
    .from("profiles")
    .upsert(dedupeById(profiles), { onConflict: "id" });
  if (pErr) console.error("  ✗ profiles upsert:", pErr.message);
  else console.log(`  ✓ profiles upserted: ${profiles.length}`);

  const projectRows = dedupeById(starterProjects.map((p) => ({ id: String(p.id), data: p })));
  const { error: prjErr } = await admin.from("projects").upsert(projectRows);
  if (prjErr) console.error("  ✗ projects upsert:", prjErr.message);
  else console.log(`  ✓ projects upserted: ${projectRows.length}`);

  const taskRows = dedupeById(starterTasks.map((t) => ({ id: String(t.id), data: t })));
  const { error: tErr } = await admin.from("tasks").upsert(taskRows);
  if (tErr) console.error("  ✗ tasks upsert:", tErr.message);
  else console.log(`  ✓ tasks upserted: ${taskRows.length}`);

  const { error: sErr } = await admin.from("app_state").upsert([
    { key: "dailyBaseline", data: starterDailyBaseline },
    { key: "removedUserIds", data: [] },
  ]);
  if (sErr) console.error("  ✗ app_state upsert:", sErr.message);
  else console.log("  ✓ app_state seeded (dailyBaseline, removedUserIds)");

  // Write a credentials sheet for the admin to hand out.
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "seed-output", "team-accounts.csv");
  mkdirSync(dirname(outPath), { recursive: true });
  const header = "Name,Email,Username,Role,Password";
  const lines = credentials.map(
    (c) =>
      `"${c.name}","${c.email}","${c.username}","${c.role}","${c.password}"`,
  );
  writeFileSync(outPath, [header, ...lines].join("\n"), "utf8");

  console.log(`\n✓ Done. Credentials written to:\n  ${outPath}`);
  console.log(
    `\n  Everyone signs in with their email (or username) and the password "${DEFAULT_PASSWORD}".` +
      "\n  Ask each person to change their password after first login.\n",
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
