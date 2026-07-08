# Projects Hub

Internal project management and task tracking MVP continued from the Codex handoff file.

## What is included

- Dashboard with project KPIs, active work, progress, and busy people.
- Projects and project detail pages.
- New project form with requirements formatting, data links, and initial team mapping.
- Task creation and inline task editing.
- Task data reference as either a local/network path or a download link.
- Automatic project progress and project status from task progress/status.
- Team workload calculation.
- Simple Gantt chart from task start and due dates.
- Browser localStorage persistence for projects, tasks, selected project, and current page.

## Run in this Codex workspace

From this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

Then open:

```txt
http://127.0.0.1:5173
```

## Build check

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

## Normal Node setup later

If Node.js and npm are installed normally on the machine, the usual commands also work:

```bash
npm install
npm run dev
npm run build
```

