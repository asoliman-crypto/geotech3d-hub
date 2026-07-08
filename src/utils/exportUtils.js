// Dependency-free CSV export + print-to-PDF helpers.
// Kept library-free on purpose so the portable single-file build stays small
// and works fully offline (see scripts/build-portable.mjs).

import { calculateProjectProgress } from "./projectLogic.js";

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...bodyLines].join("\r\n");
}

export function downloadCsv(filename, csv) {
  // Prepend a UTF-8 BOM so Excel reads Arabic / accented text correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function employeeName(employees, id) {
  return employees.find((employee) => employee.id === id)?.name || "Unassigned";
}

function projectName(projects, id) {
  return projects.find((project) => project.id === id)?.name || id || "";
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportProjectsCsv(projects, tasks, employees) {
  const headers = [
    "Project ID",
    "Name",
    "Client",
    "Manager",
    "Status",
    "Priority",
    "Start",
    "End",
    "Progress %",
    "Team Size",
    "Tasks",
  ];
  const rows = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const progress = project.progress ?? calculateProjectProgress(project.id, projectTasks);
    return [
      project.id,
      project.name,
      project.client || "",
      employeeName(employees, project.managerId),
      project.status || "",
      project.priority || "",
      project.start || "",
      project.end || "",
      progress,
      Array.isArray(project.team) ? project.team.length : 0,
      projectTasks.length,
    ];
  });
  downloadCsv(`geotech3d-projects-${stamp()}.csv`, rowsToCsv(headers, rows));
}

export function exportTasksCsv(tasks, projects, employees) {
  const headers = [
    "Task ID",
    "Project",
    "Title",
    "Assignee",
    "Status",
    "Priority",
    "Progress %",
    "Start",
    "End",
    "QC Status",
  ];
  const rows = tasks.map((task) => [
    task.id,
    projectName(projects, task.projectId),
    task.title,
    employeeName(employees, task.assigneeId),
    task.status || "",
    task.priority || "",
    Number(task.progress || 0),
    task.start || "",
    task.end || "",
    task.qcStatus || "",
  ]);
  downloadCsv(`geotech3d-tasks-${stamp()}.csv`, rowsToCsv(headers, rows));
}

export function exportDailyReportCsv(report) {
  const headers = [
    "Project",
    "Manager",
    "Start-of-day %",
    "Current %",
    "Gain Today (pts)",
    "Tasks Completed Today",
    "Status",
  ];
  const rows = (report.worked || []).map((row) => [
    row.projectName,
    row.managerName,
    row.base,
    row.current,
    row.gain,
    row.doneTodayCount,
    row.status,
  ]);
  downloadCsv(`geotech3d-daily-report-${report.dateStr || stamp()}.csv`, rowsToCsv(headers, rows));
}

export function printReport() {
  window.print();
}
