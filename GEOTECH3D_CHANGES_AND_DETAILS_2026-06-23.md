# GEOTECH 3D / GEOSPATIAL HUB — Changes & Full Project Details

Date: 2026-06-23
Scope: Detailed documentation of the project and every change made in this update session.

---

## 1. Project Identity

- **Name:** GEOTECH 3D / GEOSPATIAL HUB — Task / Project Management System (local MVP).
- **Purpose:** Enterprise task/project management for GEOTECH 3D — projects, tasks, employees, roles & permissions (RBAC), workload, executive monitoring, approvals, QC review, comments, notifications, project archive, Gantt/timeline, daily productivity reporting, and a portable offline demo build.
- **Tech stack:** React 19, Vite 8, JavaScript, CSS, `localStorage` persistence, mock/frontend auth. **No backend yet** (passwords are demo-only in frontend data).
- **Project folder:** `...\files-mentioned-by-the-user-projects\projects-hub`
- **Local dev URL:** http://127.0.0.1:5173/

---

## 2. How to Run & Build

```powershell
npm install            # first time only
npm run dev            # dev server at http://127.0.0.1:5173/
npm run build          # production build -> dist/
npm run build:portable # build + single-file offline demo -> dist-portable/
npm run preview        # preview the production build
```

`package.json` scripts:

```json
{
  "dev": "vite --host 127.0.0.1",
  "build": "vite build",
  "build:portable": "npm run build && node scripts/build-portable.mjs",
  "preview": "vite preview --host 127.0.0.1"
}
```

Dependencies: `react`, `react-dom`, `framer-motion`, `lucide-react`. Dev: `vite`, `@vitejs/plugin-react`.

---

## 3. Session Changes (this update) — In Detail

Seven things were added/changed this session. Each is described below with the exact behaviour and files touched.

### 3.1 Starter Workspace Data (sample projects + tasks)

The workspace used to open empty. It now seeds a realistic GEOTECH demo **once**, without ever overwriting real user-created data.

- New exports in `src/data/demoData.js`:
  - `starterProjects` — 3 projects:
    1. `PRJ-1010` **Riyadh Smart City GIS Base Map** (manager: Engy yosry / GIS)
    2. `PRJ-1011` **New Administrative Capital - BIM Coordination** (manager: Mayar abd elazeem / Architecture)
    3. `PRJ-1012` **Dubai Marina Topographic Survey** (manager: Mahmoud elkady / Geomatics)
  - `starterTasks` — 10 tasks spread across GIS / Architecture / Geomatics teams with mixed statuses (Completed, In Progress, Pending Review, To Do, Blocked). The 3 completed tasks carry `completedAt`/`updatedAt = today` so the Daily Report has content.
  - `starterDailyBaseline` — start-of-day progress per project (`PRJ-1010: 55`, `PRJ-1011: 40`, `PRJ-1012: 50`) so the Daily Report shows a realistic positive gain.
- Seed mechanism in `src/App.jsx`:
  - Constant `starterSeedVersion = "geotech3d-starter-2026-06-23-v2"` + `starterProjectIds`.
  - A one-time `useEffect` keyed on `projects-hub.starterSeedVersion` seeds when the workspace is **empty** OR refreshes an **unmodified starter demo** to the latest version. It never replaces real user projects.
- Status of each project is recomputed from its tasks by `getProjectStatus()` — so the seed intentionally yields Active / Delayed / In Review signals on the dashboard.
- The older empty-demo cleanup (`emptyDemoVersion`) that wipes legacy demo data still exists and is independent.

> Note: Vite HMR can persist intermediate `localStorage` state while editing. A clean full reload (or a fresh browser) runs the seed correctly.

### 3.2 CSV / PDF Export

New dependency-free export utilities (keeps the portable build small and fully offline).

- New file `src/utils/exportUtils.js`:
  - `rowsToCsv(headers, rows)` + `downloadCsv(filename, csv)` — proper CSV escaping + UTF-8 BOM (so Excel reads Arabic / accented text correctly) + Blob download.
  - `exportProjectsCsv(projects, tasks, employees)`
  - `exportTasksCsv(tasks, projects, employees)`
  - `exportDailyReportCsv(report)`
  - `printReport()` — `window.print()` driven by a print stylesheet.
- UI: an **Export CSV** + **Print / PDF** toolbar (`ExportBar` component in `App.jsx`) appears on **Projects**, **Tasks**, the **Dashboard** hero, and the **Daily Report**.
- Print: `@media print` rules in `styles.css` hide the sidebar, topbar and buttons (`.no-print`) and lay the content out cleanly for a PDF.

### 3.3 Official GEOTECH 3D Branding

The real brand is **gold/olive + graphite** (not green). Extracted from the official logo and applied across the app.

- Palette (CSS variables in `src/styles.css` `:root`):
  - `--geo-gold: #a0840d`, `--geo-gold-dark: #6d5b07`, `--geo-gold-soft: #c9a93a`
  - `--geo-graphite: #626366`, `--geo-charcoal: #231f20`, `--geo-silver: #929497`
- Fonts (embedded via `@font-face`, default family is now Graphik):
  - **Graphik** (Latin) weights 400/500/600/700 — `src/assets/fonts/Graphik-*.otf`
  - **Neo Sans Arabic** 400/700 — `src/assets/fonts/NeoSansArabic-*.ttf` (`--geo-font-ar`)
- Logos in `src/assets/brand/`: `geotech3d-logo-full.svg` (used in the report + login), `geotech3d-logo-alt.svg`, `geotech3d-logo-white.png`, `geotech3d-logo-dark.png`.
- Source materials: `C:\Users\pc\Desktop\geo-branding\` (extracted from `GEO EGYPT BRANDING MATERIALS.rar`).

### 3.4 Daily Report Feature

A one-page branded daily productivity report.

- Nav view `report` ("Daily Report") + a gold **Daily Report** CTA on the dashboard hero.
- Content:
  - KPIs: Projects Worked On, Tasks Completed Today, Avg Productivity Gain, Overall Completion.
  - Per-project table: start-of-day % → current % → **gain today (pts)** → tasks completed today → status.
  - List of tasks completed today (project, owner, time).
- Logic (in `App.jsx`):
  - `dailyReport` `useMemo` computes the above from role-scoped projects/tasks and the daily baseline.
  - Per-day baseline stored in `localStorage` key `projects-hub.dailyBaseline` (`{ date, progress: { projectId: pct } }`); a `useEffect` records it on the first load of each new day, using the seeded start-of-day values for the unmodified starter demo.
  - "Completed today" relies on task `completedAt`; "worked today" = positive gain OR a task updated/completed today.
- Completion stamps: `updateTask()` and `handleQcReview()` now set `updatedAt` always and `completedAt` the first time a task becomes complete.
- Export: CSV (`exportDailyReportCsv`) + Print/PDF; both branded.
- Permissions: `report` added to `src/auth/permissions.js` (management / team-lead / monitoring roles).

### 3.5 Login + Dashboard + Sidebar Polish

Applied the gold/graphite identity (was green/blue).

- **Login page** (`src/components/LoginPage.jsx` + `styles.css`):
  - Official full SVG logo replaces the old PNG; removed the redundant "GEOSPATIAL HUB" text (the logo already contains it).
  - Hero background shifted to charcoal/graphite with gold contour tints.
  - Gold **Login** button, gold field-focus, gold card top accent, gold kicker, gold "remember me", gold quick-access labels.
  - Hero headline now uses Graphik.
- **Dashboard / Sidebar**:
  - Sidebar: dark graphite background, **gold brand-mark** (charcoal icon), **gold active nav** item.
  - Executive hero: charcoal/graphite background, **gold left accent**, gold eyebrow.
  - All section-title icons are now gold.
  - Sidebar brand text: "Projects Hub / Internal operations" → **GEOTECH 3D / Geospatial Hub**; topbar eyebrow "React MVP" → **GEOTECH 3D · Geospatial Hub**; page `<title>` → **GEOTECH 3D · Geospatial Hub**.
- Fix: the login button stayed blue because `.primary-button` is declared later than `.geotech-login-button`; specificity raised to `.geotech-login-button.login-button` so the gold wins.

### 3.6 LiDAR Drone Loader

A branded loading animation: a survey drone hovering over a small city while gold LiDAR beams (animated dotted lines) scan downward; rotors spin, the drone bobs, scan points pulse, a sweep line descends.

- New file `src/components/LidarLoader.jsx` (SVG) + animation CSS/keyframes in `styles.css` (`.lidar-overlay`, `droneBob`, `rotorSpin`, `beamFlow`, `conePulse`, `sweepDown`, `scanPt`, `dotBounce`). Respects `prefers-reduced-motion`.
- Shown:
  - on every view/tab change (~0.75s, label "Scanning workspace") via a `useEffect` on `activeView`;
  - during exports (~0.95s) via `runWithLoader(fn, label)` — labels: "Generating daily report", "Exporting projects", "Exporting tasks".
- State: `loader = { active, label }` in `App.jsx`; overlay rendered at the top of the app shell.

### 3.7 Portable Offline Build Update

- `scripts/build-portable.mjs`: added MIME types for `.otf`, `.ttf`, `.eot` so the embedded brand fonts inline correctly.
- Regenerated `dist-portable/GEOTECH3D_GEOSPATIAL_HUB_DEMO.html` (+ `.zip`), ~1.9 MB, fully self-contained: 0 external `/assets/` references, all 6 fonts + the SVG logo inlined as data URLs, seed data and the LiDAR loader baked in. Opens by double-clicking in Chrome/Edge — no npm/server needed.

---

## 4. Data Model (shapes)

**Project**

```
id, name, client, managerId, status, priority, start, end,
requirements, dataLinks: [{ id, title, url }], team: [employeeId],
(+ normalized: cancelledBy, cancelledByName, cancelledAt, cancellationReason, cancellationTaskAction)
```

**Task**

```
id, projectId, title, assigneeId, status, progress, start, end, priority,
notes, dataRefType, dataRefValue,
createdBy: { id, name, role, location }, createdAt,
qcStatus, submittedForReviewBy/Name/At, reviewedBy/Name/At, reviewComment,
revisionCount, returnedToAssigneeAt,
updatedAt, completedAt            // NEW this session
(approval-request tasks also: approvalRequired, approvalStatus, approvalOwner/Id, submittedAt, requestedStatus)
```

Project status is derived from task state by `getProjectStatus()`; project progress by `calculateProjectProgress()`.

---

## 5. Important localStorage Keys

```
projects-hub.projects            projects-hub.authUsers
projects-hub.tasks               projects-hub.removedUserIds
projects-hub.notifications       projects-hub.authSession
projects-hub.comments            projects-hub.rememberedEmail
projects-hub.activeView          projects-hub.sidebarCollapsed
projects-hub.projectFilters      projects-hub.selectedProjectId
projects-hub.emptyDemoVersion    projects-hub.starterSeedVersion   // seed/refresh control
projects-hub.dailyBaseline       // NEW: per-day start-of-day progress for the Daily Report
```

If the UI ever shows stale data: refresh; if still stale, clear `localStorage` for `127.0.0.1:5173`. To force a demo re-seed: clear `projects-hub.starterSeedVersion` + the projects/tasks/dailyBaseline keys and reload.

---

## 6. Login Accounts (demo)

All accounts use the mock password **`Geo@123456`**. Login works with username OR email (`<username>@geotech3d.local`).

| User | Username | Role |
|------|----------|------|
| Sherif Gomaa (General Manager) | `sherif.gomaa` | Admin |
| Abdelrahman Soliman (Operation Technical Manager) | `abdelrahman.soliman` | Manager / approval owner |
| Eng. Waleed | `waleed` | CEO (read-only monitoring) |
| Omar (Dubai) | `omar` | External Project Monitor |
| Qarani (Saudi Arabia) | `qarani` | Regional Follow-up Access |
| Nawar (Abu Dhabi) | `nawar` | Management Monitoring Access |
| Quick role cards | `gm`, `ceo`, `abdelrahman` | GM / CEO / Manager |

Plus ~15 real GEOTECH employees across Management / Architecture / GIS / Geomatics (Managers + Employees).

---

## 7. File-by-File Change List (this session)

- `src/data/demoData.js` — added `starterProjects`, `starterTasks` (with `completedAt`/`updatedAt` on completed tasks), `starterDailyBaseline`, `seedNowIso`, `creator()` helper.
- `src/App.jsx` —
  - imports: export utils, `LidarLoader`, `geoBrandLogo` (SVG), starter exports, icons `Download`/`Printer`/`FileText`/`TrendingUp`;
  - `starterSeedVersion` v2 + `starterProjectIds`; `dailyBaseline` state; `loader` state;
  - effects: starter seed/refresh, per-day baseline, loader-on-view-change;
  - `runWithLoader()`; `dailyReport` `useMemo`;
  - `updateTask()`/`handleQcReview()` set `updatedAt`/`completedAt`;
  - new components `ExportBar` and `DailyReport`; nav item `report` + report view render;
  - Dashboard `onOpenReport` + gold report CTA; brand text (sidebar / topbar); export wiring; `LidarLoader` render.
- `src/utils/exportUtils.js` — **new** (CSV + print + `exportDailyReportCsv`).
- `src/components/LidarLoader.jsx` — **new** (drone/LiDAR/city SVG).
- `src/components/LoginPage.jsx` — official SVG logo; removed redundant span.
- `src/auth/permissions.js` — `report` view access.
- `src/styles.css` — `@font-face` brand fonts; brand palette vars; default font Graphik; export toolbar + `@media print`; Daily Report styles; login green→gold/graphite; sidebar/hero/section-title branding; LiDAR loader styles + keyframes.
- `index.html` — `<title>` → "GEOTECH 3D · Geospatial Hub".
- `scripts/build-portable.mjs` — added `.otf`/`.ttf`/`.eot` MIME types.
- `src/assets/brand/*` — added logos. `src/assets/fonts/*` — added Graphik + Neo Sans Arabic.

---

## 8. Verification & Notes

- `npm run build` succeeds (1757 modules) and `npm run build:portable` produces a self-contained ~1.9 MB HTML.
- Verified live in the dev app (DOM/computed-style checks — screenshots time out due to framer-motion animation): seed data + KPIs correct; Daily Report numbers correct (Riyadh +13%, NAC +8%, Marina +7%, avg +9%); branding colors applied (gold login button, gold sidebar/hero, Graphik loaded); LiDAR loader appears on tab switch and export with the correct labels; clean console.
- Still MVP: replace frontend auth/passwords with a real backend before production.

---

## 9. Short Prompt for the Next Assistant

```text
Continue the existing React/Vite local MVP "GEOTECH 3D / GEOSPATIAL HUB". Do not rebuild.
Work inside: ...\files-mentioned-by-the-user-projects\projects-hub
It already has: branded login (gold/graphite + Graphik/Neo Sans Arabic + official logo), RBAC,
real GEOTECH employees as auth users, executive monitoring users, task approval + QC review,
notifications, Users & Roles admin, project archive/cancellation, Gantt/workload/dashboard,
a one-time starter seed (3 projects / 10 tasks, starterSeedVersion v2), a branded Daily Report
(daily productivity + per-day baseline in projects-hub.dailyBaseline), CSV + Print/PDF export,
a LiDAR drone loader on view changes and exports, and a self-contained portable offline build.
Keep the gold/graphite identity, preserve features, use localStorage/mock data, run npm run build
after changes, and npm run build:portable when the offline demo must be regenerated.
```
