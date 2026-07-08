import { CalendarDays, Users } from "lucide-react";
import { PriorityBadge, ProgressBar, StatusBadge } from "./ui.jsx";
import { calculateProjectProgress, formatDateRange, getProjectStatus } from "../utils/projectLogic.js";

export function ProjectCard({ project, employees, tasks, onOpen }) {
  const manager = employees.find((employee) => employee.id === project.managerId);
  const status = getProjectStatus(project, tasks);
  const progress = calculateProjectProgress(project.id, tasks);

  return (
    <button
      className={`project-card ${status === "Cancelled" ? "project-card-cancelled" : ""}`}
      type="button"
      onClick={() => onOpen(project.id)}
    >
      <div className="project-card-top">
        <div>
          <span className="eyebrow">{project.id}</span>
          <h3>{project.name}</h3>
          <p>{project.client}</p>
        </div>
        <PriorityBadge value={project.priority} />
      </div>

      <div className="project-card-meta">
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          {formatDateRange(project.start, project.end)}
        </span>
        <span>
          <Users size={15} aria-hidden="true" />
          {project.team.length} team members
        </span>
      </div>

      <ProgressBar value={progress} />

      <div className="project-card-footer">
        <StatusBadge value={status} />
        <span>{manager?.name || "No manager"}</span>
      </div>
      {status === "Cancelled" ? (
        <small className="cancelled-card-note">{project.cancellationReason || "Cancelled project record"}</small>
      ) : null}
    </button>
  );
}
