const COMPLETE_STATUSES = ["Done", "Completed"];
const ACTIVE_STATUSES = ["Planning", "To Do", "In Progress", "Under Review", "Needs Revision", "Blocked"];

export function isTaskComplete(task) {
  return COMPLETE_STATUSES.includes(task?.status);
}

export function clampProgress(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

export function isOverdue(task, today = new Date()) {
  if (!task?.end || isTaskComplete(task) || task.status === "Cancelled") return false;
  const end = new Date(`${task.end}T23:59:59`);
  return end < today;
}

export function calculateProjectProgress(projectId, taskList) {
  const projectTasks = taskList.filter((task) => task.projectId === projectId);
  if (!projectTasks.length) return 0;
  return Math.round(
    projectTasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / projectTasks.length,
  );
}

export function getProjectStatus(project, taskList) {
  if (project.status === "Cancelled") return "Cancelled";
  const projectTasks = taskList.filter((task) => task.projectId === project.id);
  if (!projectTasks.length) return project.status;
  if (projectTasks.some((task) => task.approvalStatus === "Pending Approval")) return "Pending Approval";
  if (projectTasks.every((task) => isTaskComplete(task))) return "Completed";
  if (projectTasks.some((task) => isOverdue(task) || task.status === "Blocked")) return "Delayed";
  if (projectTasks.some((task) => !task.dataRefValue && !isTaskComplete(task))) return "Waiting for Data";
  if (projectTasks.some((task) => ["Under Review", "Pending Review"].includes(task.status))) return "In Review";
  if (
    projectTasks.some(
      (task) =>
        ["Planning", "In Progress", "Under Review", "Needs Revision"].includes(task.status) ||
        Number(task.progress || 0) > 0,
    )
  ) {
    return "In Progress";
  }
  return project.status;
}

export function syncProjectsWithTasks(projects, tasks) {
  return projects.map((project) => ({
    ...project,
    status: getProjectStatus(project, tasks),
  }));
}

export function normalizeTaskProgress(task, patch) {
  const next = { ...task, ...patch };

  if (Object.prototype.hasOwnProperty.call(patch, "progress")) {
    next.progress = clampProgress(patch.progress);
    if (next.progress === 100) {
      next.status = "Completed";
    } else if (next.progress > 0 && task.status === "To Do") {
      next.status = "In Progress";
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    if (COMPLETE_STATUSES.includes(patch.status)) {
      next.progress = 100;
    }
    if (patch.status === "To Do" && next.progress === 100) {
      next.progress = 0;
    }
  }

  return next;
}

export function getEmployeeWorkload(employee, tasks) {
  const activeTasks = tasks.filter(
    (task) => task.assigneeId === employee.id && ACTIVE_STATUSES.includes(task.status),
  );
  const utilization = Math.round((activeTasks.length / employee.capacity) * 100);

  let status = "Available";
  if (utilization >= 100) status = "Overloaded";
  else if (utilization >= 75) status = "Busy";
  else if (utilization >= 35) status = "Normal";

  return {
    activeTasks: activeTasks.length,
    utilization,
    status,
  };
}

export function makeProjectId(projects) {
  const numbers = projects
    .map((project) => Number(String(project.id).replace(/\D/g, "")))
    .filter(Boolean);
  const next = Math.max(1000, ...numbers) + 1;
  return `PRJ-${next}`;
}

export function formatDateRange(start, end) {
  if (!start && !end) return "No timeline";
  return `${start || "No start"} to ${end || "No end"}`;
}
