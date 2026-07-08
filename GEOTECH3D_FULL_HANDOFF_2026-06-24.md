# GEOTECH 3D / GEOSPATIAL HUB — Full Handoff for the Next Assistant

Date: 2026-06-24
Purpose: Give a new Claude/assistant everything needed to continue this project with **no prior context**. Read this first.

---

## 0. TL;DR

- React + Vite **local MVP** project/task management app for GEOTECH 3D. Data is in **localStorage only** (mock/frontend auth, no backend).
- **Do NOT rebuild from scratch.** Preserve existing features. Keep the gold/graphite GEOTECH brand.
- After code changes run `npm run build`. When the offline demo must be refreshed, run `npm run build:portable`.
- Big picture: branded login, RBAC, real employees as auth users, executive dashboard, approvals + QC review, notifications, Users & Roles admin, project archive/cancellation, Gantt, workload, **Daily Report**, **Reports Center (weekly)**, **Map View**, **Attendance**, **Audit Log**, task **subtasks/dependencies/attachments**, **CSV + print-to-PDF export**, **Company Report (PDF)**, **per-project Gantt Report (PDF)**, a **LiDAR drone loading animation**, and a **portable single-file offline build**.

---

## 1. Location & Commands

- Project folder: `C:\Users\pc\Documents\Codex\2026-05-23\files-mentioned-by-the-user-projects\projects-hub`
- Dev URL: http://127.0.0.1:5173/

```powershell
npm install            # first time
npm run dev            # dev server (vite --host 127.0.0.1)
npm run build          # production build -> dist/
npm run build:portable # build + node scripts/build-portable.mjs -> dist-portable/ (single self-contained HTML + zip)
npm run preview        # preview production build
```

Deps: `react` 19, `react-dom` 19, `framer-motion`, `lucide-react`. Dev: `vite` 8, `@vitejs/plugin-react`.

Portable output: `dist-portable/GEOTECH3D_GEOSPATIAL_HUB_DEMO.html` (+ `.zip`), ~1.97 MB, fully self-contained (fonts + logo inlined as data URLs, 0 external `/assets/` refs). Opens by double-click in Chrome/Edge — no server. NOTE: the dev `index.html` at the project root is the Vite source entry and shows a blank page if opened directly; only the `dist-portable` HTML works standalone.

---

## 2. Architecture & File Map

`App.jsx` is the large root (~4,300 lines) that owns all state (via `useLocalStorage`), effects, handlers, and STILL renders several pages inline: Dashboard, ProjectsPage, ProjectArchivePage, ProjectDetail, TasksPage, NewProjectPage, WorkloadPage, DailyReport, ApprovalCenter, NotificationsPage, ReviewQueuePage, plus the nav/topbar/shell. (Further extraction is a good future cleanup.)

Key files:
- `src/App.jsx` — root, state, routing (by `activeView`), handlers.
- `src/main.jsx`, `src/styles.css` (~3,100 lines, all CSS incl. brand, print, loader, map).
- `src/components/`
  - `LoginPage.jsx` — branded login (uses official SVG logo).
  - `ui.jsx` — `Badge`, `StatusBadge`, `PriorityBadge`, `ProgressBar`, `Field`, `EmptyState`, **`SectionTitle`**, **`ExportBar`** (last two were moved here from App.jsx).
  - `KpiCard.jsx`, `ProjectCard.jsx`, `TaskTable.jsx`, `GanttChart.jsx`, `DataLinksBar.jsx`, `FormattedRequirements.jsx`, `AdminPages.jsx` (Users & Roles).
  - `LidarLoader.jsx` — drone/LiDAR loading animation.
  - `ReportsCenter.jsx`, `MapView.jsx`, `AttendancePage.jsx`, `AuditLogPage.jsx` — extracted pages (were inline in App.jsx).
  - `CompanyReport.jsx`, `ProjectGanttReport.jsx` — branded PDF report views.
- `src/utils/`
  - `storage.js` — `useLocalStorage`.
  - `dataMigration.js` — `normalizeProjectsForEmployees`, `normalizeTasksForEmployees` (fill defaults, map legacy employee ids, retire Sherif → Mona).
  - `projectLogic.js` — `isTaskComplete`, `clampProgress`, `isOverdue`, `calculateProjectProgress`, `getProjectStatus`, `syncProjectsWithTasks`, `normalizeTaskProgress`, `getEmployeeWorkload`, `makeProjectId`.
  - `linkUtils.js` — `normalizeUrl`.
  - `dateUtils.js` — `isoToday`, `formatDateTime`, `formatShortDate`, `formatTime`, `getWeekStart`, `isWithinCurrentWeek`, `isLateCheckIn`, `getAttendanceStatus`, `getDaysUntil`.
  - `geo.js` — `inferProjectGeo(project)` + `projectMapPoint(lat,lng)` (Map View geolocation via equirectangular projection).
  - `exportUtils.js` — dependency-free CSV (`exportProjectsCsv`, `exportTasksCsv`, `exportDailyReportCsv`, `rowsToCsv`, `downloadCsv` with UTF-8 BOM) + `printReport()` (window.print).
- `src/auth/`
  - `authData.js` — `ROLES`, `teamUsers`, `quickLogin*`, `authenticateUser`, `ensureAuthUsers`, `sanitizeUser`, `APPROVAL_OWNER_ID = "abdelrahman-soliman"`, legacy identifier map.
  - `permissions.js` — `VIEW_ACCESS`, `canAccessView`, `getCapabilities`, `canCreateProject`, `canViewCompanyReport`, `getRoleTone`.
- `src/data/demoData.js` — `employees`, `initialProjects = []`, `initialTasks = []`, `starterProjects` (3), `starterTasks` (10), `starterDailyBaseline`.
- `src/assets/brand/` (logos: `geotech3d-logo-full.svg`, `-alt.svg`, `-white.png`, `-dark.png`), `src/assets/fonts/` (Graphik 400/500/600/700 .otf, Neo Sans Arabic 400/700 .ttf), `src/assets/geotech3d-logo.png`.
- `scripts/build-portable.mjs` — inlines dist assets (incl. otf/ttf/svg) into one HTML + zips it (dependency-free).

---

## 3. Authentication & Users

- Login by **username OR email** + password. Emails: `<username>@geotech3d.local`. Universal mock password: **`Geo@123456`**.
- `teamUsers = employees.map(toAuthUser) + executiveUsers + roleAccessUsers`. Persisted to `projects-hub.authUsers` and reconciled by `ensureAuthUsers`.
- **Mona Hassan replaced Sherif Gomaa as GM** (2026-06-23). `sherif.gomaa` is retired (maps to `gm@geotech3d.local`, filtered out of custom users).

Roles (`ROLES` in authData.js):
`ADMIN "Admin"`, `MANAGER "Manager"`, `EMPLOYEE "Employee"`, `CEO "CEO"`, `EXTERNAL_MONITOR`, `REGIONAL_FOLLOW_UP`, `MANAGEMENT_MONITOR`, `TEAM_MEMBER "team_member"`, `TEAM_LEAD "team_lead"`, `ROLE_MANAGER "manager"`, `GM "gm"`, `ROLE_CEO "ceo"`.

Key accounts (password `Geo@123456` for all):
- **Mona Hassan** — `mona.hassan` (Admin, General Manager) and quick card `gm` (role `gm`).
- **Abdelrahman Soliman** — `abdelrahman.soliman` (Manager, Operation Technical Manager) and quick card `abdelrahman` (role `manager`). His employee id `abdelrahman-soliman` = `APPROVAL_OWNER_ID` (the approval owner for monitor task requests).
- **Eng. Waleed** — `waleed` (CEO) and quick card `ceo` (role `ceo`).
- **Team leads** (system role `Manager`, identified by title): Mayar abd elazeem (`mayar.abd.elazeem`, Architecture), Engy yosry (`engy.yosry`, GIS), Mahmoud elkady (`mahmoud.elkady`, "Head Geomatics").
- Islam saied (`islam.saied`, Manager — a *generic* manager, NOT a team lead).
- 9 employees (role Employee): mahmoud.mohamed, mahmoud.emad, yasmin.abdelgwad, norhan.shaaban, ahmed.khalaf, abdelrahman.khaled, rahma.alaa.magdi, beshoy.ataf, mostafa.khaled.mohamed.
- Monitors: `omar` (External Project Monitor, Dubai), `qarani` (Regional Follow-up, Saudi Arabia), `nawar` (Management Monitoring, Abu Dhabi).

---

## 4. RBAC (permissions.js)

`getCapabilities(user)` returns the capability flags used across the UI. Key ones:
- `canManageProjects` (edit/cancel projects, manage tasks): Admin/GM/Manager/ROLE_MANAGER (`PROJECT_MANAGEMENT_ROLES`).
- `canCreateProjects` = `canCreateProject(user)` — **who may CREATE projects (user decision 2026-06-24):** team leads + the operation manager (Abdelrahman) + GM/Admin (Mona) + CEO. Implemented as: `FULL_MANAGEMENT_ROLES (Admin/GM)` OR `CEO/ROLE_CEO` OR operation manager (`id`/`employeeId === APPROVAL_OWNER_ID`) OR team lead (`role === team_lead`, or title/actualRole/department contains "team lead" or "head geomatics"). **Excludes generic managers (e.g. Islam) and employees/monitors.**
- `canViewCompanyReport`: Admin/GM/CEO/ROLE_CEO OR operation manager (Abdelrahman).
- `canManageTasks`: `canManageProjects` OR team_lead. `canSubmitTaskReview`, `canReviewTasks`, `canCompleteTasksDirectly`, `canApproveTaskRequests` (system managers or approval owner), `canCreateTaskRequests` (monitors only), `canViewAuditLog`, `canManageAttendance`, `canViewExecutiveDashboard`, `isReadOnlyMonitor`, etc.

`VIEW_ACCESS` maps each view id → allowed roles. `canAccessView(user, viewId)` special-cases:
- `approvals` → Admin/GM or approval owner.
- `company-report` → `canViewCompanyReport`.
- `project-report` → same as `detail`.
- `new` → `canCreateProject` (NOT the plain VIEW_ACCESS.new).

Nav items (order, `App.jsx` `navItems`): dashboard, report (Daily Report), insights (Reports), map (Map View), projects, archive, detail, tasks, review (Review Queue), gantt, workload, attendance, new (New Project), approvals, notifications, users (Users & Roles), audit (Audit Log), settings. Visibility filtered by `canAccessView`. Button-only views (no nav item): `company-report`, `project-report`.

---

## 5. Data Model (localStorage-backed)

**Project:** `id` (PRJ-####), `name`, `client`, `managerId`, `status`, `priority`, `start`, `end`, `requirements`, `dataLinks:[{id,title,url}]`, `team:[employeeId]`, optional `location:{city,region,lat,lng}` (for Map View). Normalized fields add `cancelledBy/ByName/At`, `cancellationReason`, `cancellationTaskAction`. `status`/`progress` are recomputed from tasks by `getProjectStatus`/`calculateProjectProgress`.

**Task:** `id` (number), `projectId`, `title`, `assigneeId`, `status`, `progress`, `start`, `end`, `priority`, `notes`, `dataRefType`, `dataRefValue`, `createdBy`, `createdAt`, `qcStatus`, `submittedForReview*`, `reviewed*`, `reviewComment`, `revisionCount`, `returnedToAssigneeAt`, **`updatedAt`**, **`completedAt`** (stamped in `updateTask`/`handleQcReview`), plus subtasks/dependencies/attachments and approval-request fields (`approvalRequired`, `approvalStatus`, `approvalOwner(Id)`, `submittedAt`, `requestedStatus`).

**Attendance record** (`projects-hub.attendance`): `id`, `userId`, `userName`, `department`, `date`, `checkIn`, `checkOut`, `location`, `notes`. Status via `getAttendanceStatus` (Late after 09:30).

**Audit event** (`projects-hub.auditLog`, capped 250): `id`, `type`, `title`, `message`, `createdAt`, `actorName`, `actorRole`, related ids. Written by `addAuditEvent` on login/logout, user mgmt, task/project/approval/QC/comment/attendance actions.

localStorage keys (prefix `projects-hub.`): `projects, tasks, notifications, comments, authUsers, removedUserIds, authSession, rememberedEmail, activeView, sidebarCollapsed, projectFilters, selectedProjectId, dailyBaseline, attendance, auditLog, starterSeedVersion, emptyDemoVersion`.

---

## 6. Seed / Demo Data

- `initialProjects`/`initialTasks` are `[]` (fresh install starts empty).
- `starterProjects` (3: `PRJ-1010` Riyadh Smart City GIS, `PRJ-1011` New Administrative Capital - BIM, `PRJ-1012` Dubai Marina Topographic Survey) + `starterTasks` (10, mixed statuses; the 3 completed have `completedAt=today`) + `starterDailyBaseline` ({PRJ-1010:55, PRJ-1011:40, PRJ-1012:50}).
- A one-time effect in `App.jsx` keyed by `starterSeedVersion = "geotech3d-starter-2026-06-23-v2"` seeds these when the workspace is **empty**, OR refreshes an **unmodified starter demo** (every project id is a starter id) to the latest version. It **never** overwrites real user-created projects. Bump this version to push new starter fields.
- Separate `emptyDemoVersion` migration wipes only the OLD legacy demo (Cairo Metro / New Capital BIM Coordination / Port GIS + PRJ-1001..1003).
- The daily baseline effect records today's start-of-day project progress (uses `starterDailyBaseline` for the unmodified starter demo so the Daily Report shows a positive gain).
- To force a re-seed in a browser: clear `projects-hub.starterSeedVersion` + the projects/tasks/dailyBaseline keys and reload.

---

## 7. Feature Reference

- **Dashboard** — executive hero (gated by `canViewExecutiveDashboard`) with brand gold accent; KPI cards; status indicators; critical updates; approval/QC queues; recent activity; workload snapshot. Hero buttons: **Daily Report**, **Company Report (PDF)** (only if `canViewCompanyReport`), Print.
- **Daily Report** (`report` view, inline in App.jsx `DailyReport`) — projects worked on today, tasks completed today, per-project gain vs start-of-day baseline; CSV + Print/PDF; branded.
- **Reports Center** (`insights` view, `ReportsCenter.jsx`) — weekly summary (`weeklyReport` memo): completed this week, delayed rate, overloaded people, completion rate, attendance signals, team activity, permission matrix; Export Weekly CSV + Print.
- **Map View** (`map` view, `MapView.jsx` + `utils/geo.js`) — regional project pins projected from real lat/lng (equirectangular), status-colored, legend, region cards, project cards with coordinates and "Open Project". Uses each project's explicit `location` if present, else name/client inference.
- **Projects / Project Detail** — list + detail. Detail header has a **Gantt Report (PDF)** button (`onOpenGanttReport`). Cancellation (not delete) → Project Archive.
- **Tasks** (`TasksPage`, inline) — "Create Task" form (only for `canManageTasks` or `canCreateTaskRequests`) + task table with inline edit, subtasks, dependencies, attachments. Monitors create task **requests** (Pending Approval → routed to Abdelrahman). Read-only roles (e.g. CEO) see "Monitored Tasks" with no create form.
- **Review Queue** (`review`) — team-lead QC accept/reject.
- **Approvals** (`approvals`) — approval owner (Abdelrahman) + system managers act on monitor task requests.
- **Attendance** (`attendance`, `AttendancePage.jsx`) — check-in/out, late after 09:30, register with editable notes, CSV export.
- **Audit Log** (`audit`, `AuditLogPage.jsx`) — real audit trail (capped 250).
- **Gantt / Team Workload / Notifications / Users & Roles / Settings** — as named.
- **Company Report** (`company-report`, `CompanyReport.jsx`) — branded PDF of ALL projects + their tasks (summary KPIs + per-project task tables). Print → Save as PDF.
- **Per-project Gantt Report** (`project-report`, `ProjectGanttReport.jsx`) — branded PDF: plan grid (client/manager/status/team/**Start (Receipt)** → **Due (Delivery)**/tasks/progress) + reused `GanttChart` + a schedule table with "Start (Receipt)"/"Due (Delivery)" columns.
- **CSV + Print** — `ExportBar` on Projects/Tasks/Dashboard/Reports; dependency-free CSV (UTF-8 BOM) and `window.print()` with a `@media print` stylesheet that hides sidebar/topbar/`.no-print`.
- **LiDAR drone loader** (`LidarLoader.jsx`) — appears ~0.75s on view changes (label "Scanning workspace") and ~0.95s on exports (via `runWithLoader`). It has `pointer-events: none` so it NEVER blocks clicks. Respects `prefers-reduced-motion`.

---

## 8. Branding

Official palette (CSS vars in `styles.css :root`): `--geo-gold #a0840d`, `--geo-gold-dark #6d5b07`, `--geo-gold-soft #c9a93a`, `--geo-graphite #626366`, `--geo-charcoal #231f20`, `--geo-silver #929497`. Default font is **Graphik** (Latin) with **Neo Sans Arabic** fallback (both `@font-face` from `src/assets/fonts/`). Logo lockup: "GEOTECH" (graphite) + "3D" (silver) + gold "GEOSPATIAL HUB" bar. Reports use `geotech3d-logo-full.svg`. Login, sidebar, dashboard hero, section-title icons, and CTAs are gold/graphite. Source materials: `C:\Users\pc\Desktop\GEO EGYPT BRANDING MATERIALS.rar` (extracted to `C:\Users\pc\Desktop\geo-branding\`).

---

## 9. What Changed in the Latest Session (2026-06-23 → 06-24)

1. Starter seed (3 projects / 10 tasks) + daily baseline; Daily Report; CSV + print-to-PDF export.
2. Full GEOTECH branding (palette, Graphik + Neo Sans Arabic fonts, official logo) + Login/Dashboard/sidebar polish.
3. LiDAR drone loader; later fixed with `pointer-events: none` (it was eating clicks during the animation → made actions feel broken).
4. (In parallel, by the user via a separate ChatGPT session) Mona replaced Sherif; added Reports Center, Map View, Attendance, Audit Log; task subtasks/dependencies/attachments.
5. Refactor: extracted ReportsCenter/MapView/AttendancePage/AuditLogPage into their own files; moved `SectionTitle`/`ExportBar` to `ui.jsx`; date/attendance helpers → `dateUtils.js`; map geolocation → `geo.js`.
6. Improved Map View: real lat/lng projection + wider city table + explicit `project.location` support.
7. Branded PDF **Company Report** + per-project **Gantt Report**.
8. **Project-creation permission rule** narrowed to team leads + operation manager + GM + CEO (see §4).

All builds green; verified in a running preview (see §11) with zero console errors.

---

## 10. Known Open Items / Suggestions

- **CEO cannot add tasks** (read-only monitoring) — the user asked about this; pending a decision to (a) enable CEO task creation, and/or (b) improve the Tasks "No tasks yet" empty-state (it currently says "Create the first task" even to read-only users — add an "Add Task" button for those who can, and a clear read-only note otherwise).
- **App.jsx is still ~4,300 lines** — Dashboard, TasksPage, ProjectDetail, NewProjectPage, DailyReport, etc. remain inline; extracting them is the next maintainability win.
- Still an MVP: mock auth / frontend passwords → replace with real backend before production. Also: real DB, API, server-side audit, secure uploads, Arabic/English toggle.
- Map View background is decorative (abstract contours); pins are accurately projected but there is no real basemap (kept offline/dependency-free on purpose).

---

## 11. Conventions & How to Verify

- Keep changes small/modular; reuse `useLocalStorage`, the `ui.jsx` components, `SectionTitle`/`ExportBar`, and the permission helpers. Keep the gold/graphite identity. Keep everything dependency-free enough that `build:portable` stays a small self-contained file.
- **Do not re-seed old sample data** and do not reintroduce generic "Projects Hub"/"React MVP" text.
- After changes: `npm run build`. If the demo matters: `npm run build:portable`.
- Verifying in a running app: this environment has a "Claude Preview" MCP. Start it on a **separate port** (e.g. `--port 5180 --strictPort` in a `.claude/launch.json` that runs `npm --prefix <project> run dev`) so it doesn't clash with the user's own dev server on 5173. Use `preview_eval` for DOM/computed-style/localStorage checks and to drive clicks. **Screenshots time out** (framer-motion keeps animating), so rely on DOM checks, not `preview_screenshot`.
- **Vite HMR can persist intermediate localStorage state while you edit** (seed/baseline may look wrong). Always confirm with a clean full reload (or restart the preview) before trusting a result.

---

## 12. Short Prompt to Paste for the Next Assistant

```text
Continue the existing React/Vite local MVP "GEOTECH 3D / GEOSPATIAL HUB". Do NOT rebuild.
Work inside: C:\Users\pc\Documents\Codex\2026-05-23\files-mentioned-by-the-user-projects\projects-hub
Read GEOTECH3D_FULL_HANDOFF_2026-06-24.md first. It documents everything: RBAC, users (Mona Hassan is
GM/Admin; Abdelrahman is the operation manager / approval owner; Waleed is CEO), the starter seed, the
Daily Report, Reports Center, Map View, Attendance, Audit Log, CSV + print-to-PDF export, the branded
Company Report and per-project Gantt Report, the LiDAR loader, and the gold/graphite branding.
Data is localStorage-only (mock auth). Keep features and the gold/graphite identity. Run npm run build
after changes and npm run build:portable when the offline demo must be regenerated. Verify via the
Claude Preview MCP on a separate port with preview_eval (screenshots time out — use DOM checks).
Open question the user raised: whether the CEO should be able to create tasks (currently read-only).
```
