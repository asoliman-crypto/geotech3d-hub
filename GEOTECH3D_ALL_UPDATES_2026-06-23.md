# GEOTECH 3D / GEOSPATIAL HUB - All Updates

Date: 2026-06-23

Project folder:

`C:\Users\pc\Documents\Codex\2026-05-23\files-mentioned-by-the-user-projects\projects-hub`

Local app URL:

`http://127.0.0.1:5173/`

---

## 1. Project Overview

This is the GEOTECH 3D / GEOSPATIAL HUB local MVP system.

It is a React/Vite task and project management platform for:

- Projects
- Tasks
- Employees
- Roles and permissions
- Executive monitoring
- Approvals
- QC review
- Notifications
- Workload
- Gantt/timeline
- Reports
- Attendance
- Audit log
- Project map
- Portable offline demo sharing

The project still uses local/mock frontend data and `localStorage` for MVP/demo use.

---

## 2. Run Commands

```powershell
npm run dev
npm run build
npm run build:portable
npm run preview
```

Important local URL:

```text
http://127.0.0.1:5173/
```

Portable output:

```text
dist-portable/GEOTECH3D_GEOSPATIAL_HUB_DEMO.html
dist-portable/GEOTECH3D_GEOSPATIAL_HUB_DEMO.zip
```

---

## 3. Authentication and Users

The app has local authentication with:

- Email or username login
- Password check
- Remember me
- localStorage session persistence
- Logout
- Role-based access

Main password for demo accounts:

```text
Geo@123456
```

---

## 4. Current Important Login Accounts

### GM

```text
Name: Mona Hassan
Username: gm
Email: gm@geotech3d.local
Password: Geo@123456
Role: gm
Badge: GENERAL MANAGER
```

Mona Hassan also exists as the main General Manager employee account:

```text
Username: mona.hassan
Email: mona.hassan@geotech3d.local
Password: Geo@123456
Role: Admin
Title: General Manager
```

### Operation Manager

```text
Name: Abdelrahman Soliman
Username: abdelrahman
Email: abdelrahman@geotech3d.local
Password: Geo@123456
Badge: OPERATION MANAGER
```

### CEO

```text
Name: Eng. Waleed
Username: ceo
Email: ceo@geotech3d.local
Password: Geo@123456
Badge: CEO
```

Executive account:

```text
Username: waleed
Email: waleed@geotech3d.local
Password: Geo@123456
Role: CEO
```

### Monitoring Users

```text
omar / omar@geotech3d.local / Geo@123456
qarani / qarani@geotech3d.local / Geo@123456
nawar / nawar@geotech3d.local / Geo@123456
```

---

## 5. Latest GM Update

The user requested:

Replace Sherif Gomaa with Mona Hassan as GM.

Implemented:

- Removed Sherif Gomaa from the main employee seed.
- Added Mona Hassan as General Manager.
- Updated the GM quick login card to show Mona Hassan.
- Updated `role-gm` to point to `mona-hassan`.
- Added migration support so old references to `sherif-gomaa` map safely to `mona-hassan`.
- Added protection so old Sherif localStorage records do not reappear as custom users.

Files changed:

- `src/data/demoData.js`
- `src/auth/authData.js`
- `src/utils/dataMigration.js`
- `src/App.jsx`

Verification:

- `npm run build` passed.
- `npm run build:portable` passed.

---

## 6. UI and Branding Updates

The app uses GEOTECH 3D branding:

- Gold / olive accents
- Graphite / charcoal
- White and soft gray
- Official GEOTECH 3D logo
- Corporate enterprise style
- Graphik and Neo Sans Arabic fonts
- Premium branded login page

Login page includes:

- GEOTECH 3D logo
- GEOTECH 3D Project Control Hub heading
- Branded login form
- Team login cards
- Team Member dropdown
- Team Lead dropdown
- Operation Manager card
- GM card
- CEO card

---

## 7. Role-Based Access Control

Roles supported:

- Admin
- Manager
- Employee
- CEO
- External Project Monitor
- Regional Follow-up Access
- Management Monitoring Access
- team_member
- team_lead
- manager
- gm
- ceo

Permissions control:

- Sidebar visibility
- Page access
- Project creation/editing
- Task creation/editing
- Approval actions
- QC review
- Comments
- Notifications
- Reports
- Attendance
- Users & Roles
- Audit Log
- Settings

---

## 8. Executive Monitoring

Dashboard includes:

- Active Project Records
- Active Projects
- Delayed Projects
- At-Risk Tasks
- Pending Approval
- Pending QC Review
- Upcoming Deadlines
- Completed Tasks
- Average Progress
- Team Utilization
- Project Archive
- Critical Updates
- Deadline Watch
- Approval Queue summary
- QC Review Queue summary
- Recent Activity Timeline
- Workload Snapshot

CEO users can view executive monitoring data in read-only mode.

---

## 9. Approval Workflow

Omar, Qarani, and Nawar can create task requests.

Their tasks:

- Are created as Pending Approval.
- Are hidden from execution teams until approved.
- Are routed to Eng. Abdelrahman Soliman.
- Trigger notifications.

Approval actions:

- Approve
- Reject
- Request modifications

After approval:

- Task becomes visible to execution teams.
- Status changes to the selected/starting status.
- Creator receives a notification.

---

## 10. QC Review Workflow

Team members can submit tasks for Team Lead review.

QC statuses include:

- Not Submitted
- Pending Review
- Accepted
- Rejected

Team leads/managers can:

- Accept tasks
- Reject tasks
- Add review notes

Accepted tasks become completed.

Rejected tasks return for revision.

---

## 11. Project Archive and Cancellation

Projects are not hard-deleted.

Cancellation workflow:

- Requires a reason.
- Stores cancelledBy.
- Stores cancelledAt.
- Stores cancellationReason.
- Can lock/cancel open tasks depending on selected action.
- Moves the project to Project Archive.

Project Archive keeps cancelled records readable.

---

## 12. Reports

### Daily Report

Includes:

- Projects worked on today
- Tasks completed today
- Average productivity gain
- Overall completion
- Per-project start-of-day vs current progress
- Completed tasks list
- Export CSV
- Print / PDF

### Reports Center

New page added:

`Reports`

Includes:

- Executive weekly summary
- Weekly completed tasks
- Delayed project rate
- Overloaded people
- Completion rate
- Attendance signals
- Late check-ins
- Team weekly activity
- Permission matrix
- Export Weekly CSV
- Print / PDF

---

## 13. Map View

New page added:

`Map View`

Features:

- Lightweight local geospatial project map
- Regional project indicators
- Project pins
- Project status coloring
- Region cards
- Project location cards
- Open project directly from map list

Location inference currently detects:

- Riyadh / Saudi Arabia
- Dubai / UAE
- Abu Dhabi / UAE
- Cairo / New Administrative Capital / Egypt
- Regional fallback

---

## 14. Attendance System

New page added:

`Attendance`

Features:

- Check In
- Check Out
- Late detection after 09:30
- Current user attendance card
- Team/personal attendance scope based on role
- Attendance register
- Location field
- Notes field
- Export Attendance CSV
- localStorage persistence

localStorage key:

```text
projects-hub.attendance
```

---

## 15. Audit Log

New page added:

`Audit Log`

Tracks:

- Login
- Logout
- User added
- User removed
- User role changed
- Project created
- Project cancelled
- Task created
- Approval actions
- QC review actions
- Comments
- Attendance check-in
- Attendance check-out

localStorage key:

```text
projects-hub.auditLog
```

Audit log is limited to the latest 250 events.

---

## 16. Advanced Task Controls

Tasks page now includes:

- Subtasks
- Dependencies
- Attachments / Data Links

Subtasks:

- Add subtask
- Mark done
- Remove subtask

Dependencies:

- Link task dependencies
- Show blocking dependencies
- Remove dependency

Attachments:

- Add task-specific path/link
- Remove attachment

These are stored inside the task object in localStorage.

---

## 17. Export and Portable Build

CSV exports exist for:

- Projects
- Tasks
- Daily Report
- Weekly Report
- Attendance

Print / PDF:

- Uses browser print.
- Print styles hide sidebar/buttons.

Portable build:

```powershell
npm run build:portable
```

Creates:

```text
dist-portable/GEOTECH3D_GEOSPATIAL_HUB_DEMO.html
dist-portable/GEOTECH3D_GEOSPATIAL_HUB_DEMO.zip
```

The portable HTML:

- Opens locally by double click.
- Does not require localhost.
- Does not require npm.
- Does not require a server.
- Inlines CSS, JS, fonts, logo, and assets.

---

## 18. Important Files

```text
src/App.jsx
src/auth/authData.js
src/auth/permissions.js
src/data/demoData.js
src/components/LoginPage.jsx
src/components/AdminPages.jsx
src/components/TaskTable.jsx
src/components/LidarLoader.jsx
src/styles.css
src/utils/exportUtils.js
src/utils/dataMigration.js
src/utils/projectLogic.js
src/utils/storage.js
scripts/build-portable.mjs
```

---

## 19. Important localStorage Keys

```text
projects-hub.projects
projects-hub.tasks
projects-hub.notifications
projects-hub.comments
projects-hub.authUsers
projects-hub.removedUserIds
projects-hub.authSession
projects-hub.rememberedEmail
projects-hub.activeView
projects-hub.sidebarCollapsed
projects-hub.projectFilters
projects-hub.selectedProjectId
projects-hub.dailyBaseline
projects-hub.attendance
projects-hub.auditLog
projects-hub.starterSeedVersion
projects-hub.emptyDemoVersion
```

---

## 20. Latest Verification

Latest checks passed:

```powershell
npm run build
npm run build:portable
```

Local app returned:

```text
STATUS=200
```

Portable files regenerated successfully.

---

## 21. Notes for the Next Developer / Assistant

Do not rebuild the project from scratch.

Continue inside:

```text
C:\Users\pc\Documents\Codex\2026-05-23\files-mentioned-by-the-user-projects\projects-hub
```

Before changing anything, read:

- `src/App.jsx`
- `src/auth/authData.js`
- `src/auth/permissions.js`
- `src/data/demoData.js`
- `src/styles.css`

Keep:

- GEOTECH 3D gold/graphite branding.
- localStorage MVP behavior.
- Role-based access.
- Portable build support.
- Current user and employee structure.

For production later:

- Replace frontend passwords with backend authentication.
- Add database.
- Add real API.
- Add server-side audit trail.
- Add secure file upload.

