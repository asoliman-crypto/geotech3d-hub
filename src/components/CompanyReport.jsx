import { ArrowLeft, Printer } from "lucide-react";
import { EmptyState, ProgressBar, StatusBadge } from "./ui.jsx";
import { formatShortDate } from "../utils/dateUtils.js";
import { isTaskComplete } from "../utils/projectLogic.js";
import geoBrandLogo from "../assets/brand/geotech3d-logo-full.svg";

const ACTIVE_PROJECT_STATUSES = ["Planning", "In Progress", "In Review", "Waiting for Data"];

export function CompanyReport({ projects, tasks, employees, currentUser, onPrint, onBack }) {
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(isTaskComplete).length;
  const activeProjects = projects.filter((project) => ACTIVE_PROJECT_STATUSES.includes(project.status)).length;
  const delayedProjects = projects.filter((project) => project.status === "Delayed").length;
  const completedProjects = projects.filter((project) => project.status === "Completed").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length)
    : 0;

  return (
    <div className="stack company-report">
      <div className="report-actions-bar no-print">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
        <button className="report-cta" type="button" onClick={onPrint}>
          <Printer size={16} aria-hidden="true" />
          Print / Save as PDF
        </button>
      </div>

      <section className="panel report-sheet">
        <header className="report-header">
          <img src={geoBrandLogo} alt="GEOTECH 3D - Geospatial Hub" className="report-logo" />
          <div className="report-heading">
            <span className="eyebrow">Company Projects Report</span>
            <h2>All Projects &amp; Tasks</h2>
            <p>{dateLabel}</p>
          </div>
        </header>

        <div className="report-kpi-row report-kpi-row-6">
          <div className="report-kpi"><span>Projects</span><strong>{projects.length}</strong></div>
          <div className="report-kpi"><span>Active</span><strong>{activeProjects}</strong></div>
          <div className="report-kpi"><span>Delayed</span><strong>{delayedProjects}</strong></div>
          <div className="report-kpi"><span>Completed</span><strong>{completedProjects}</strong></div>
          <div className="report-kpi"><span>Tasks ({completedTasks} done)</span><strong>{totalTasks}</strong></div>
          <div className="report-kpi"><span>Avg Progress</span><strong>{avgProgress}%</strong></div>
        </div>

        {projects.length ? (
          projects.map((project) => {
            const manager = employees.find((employee) => employee.id === project.managerId);
            const projectTasks = tasks.filter((task) => task.projectId === project.id);
            return (
              <div className="report-project-block" key={project.id}>
                <div className="report-project-head">
                  <div>
                    <span className="eyebrow">{project.id}</span>
                    <h3>{project.name}</h3>
                    <p>
                      {project.client || "No client recorded"} · {manager?.name || "Unassigned"}
                    </p>
                  </div>
                  <div className="report-project-meta">
                    <StatusBadge value={project.status} />
                    <span>
                      {formatShortDate(project.start)} &rarr; {formatShortDate(project.end)}
                    </span>
                    <ProgressBar value={project.progress} />
                  </div>
                </div>
                {projectTasks.length ? (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Assignee</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Progress</th>
                        <th>Start</th>
                        <th>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTasks.map((task) => {
                        const assignee = employees.find((employee) => employee.id === task.assigneeId);
                        return (
                          <tr key={task.id}>
                            <td><strong>{task.title}</strong></td>
                            <td>{assignee?.name || "Unassigned"}</td>
                            <td><StatusBadge value={task.status} /></td>
                            <td>{task.priority || "—"}</td>
                            <td>{Number(task.progress || 0)}%</td>
                            <td>{formatShortDate(task.start)}</td>
                            <td>{formatShortDate(task.end)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="report-empty-note">No tasks recorded for this project yet.</p>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState title="No projects to report" text="Create projects to include them in the company report." />
        )}

        <div className="report-footer">
          Generated by {currentUser?.name || "GEOTECH 3D"} · GEOTECH 3D Geospatial Hub
        </div>
      </section>
    </div>
  );
}
