import { employees, initialProjects, initialTasks } from "../data/demoData.js";

const validEmployeeIds = new Set(employees.map((employee) => employee.id));
const seedProjectsById = new Map(initialProjects.map((project) => [project.id, project]));
const seedTasksById = new Map(initialTasks.map((task) => [task.id, task]));

const legacyEmployeeIdMap = {
  1: "abdelrahman-soliman",
  2: "mayar-abd-elazeem",
  3: "engy-yosry",
  4: "mahmoud-elkady",
  5: "norhan-shaaban",
  6: "islam-saied",
  "sherif-gomaa": "mona-hassan",
};

const fallbackManagerId = "abdelrahman-soliman";
const fallbackAssigneeId = "mahmoud-elkady";
const completeStatuses = new Set(["Done", "Completed"]);

function normalizeEmployeeId(value, fallbackId = fallbackAssigneeId) {
  const mappedValue = legacyEmployeeIdMap[value] || legacyEmployeeIdMap[String(value)] || value;
  if (validEmployeeIds.has(mappedValue)) return mappedValue;
  if (typeof mappedValue === "string" && mappedValue.trim()) return mappedValue.trim();
  return fallbackId;
}

export function normalizeProjectsForEmployees(projects) {
  if (!Array.isArray(projects) || !projects.length) return initialProjects;

  return projects.map((project) => {
    const seedProject = seedProjectsById.get(project.id);
    const isSeedProject = seedProject?.name === project.name;
    const sourceTeam = isSeedProject ? seedProject.team : project.team;
    const sourceManagerId = isSeedProject ? seedProject.managerId : project.managerId;
    const team = Array.isArray(sourceTeam)
      ? sourceTeam.map((memberId) => normalizeEmployeeId(memberId, "")).filter(Boolean)
      : [];
    const managerId = normalizeEmployeeId(sourceManagerId, fallbackManagerId);

    return {
      ...project,
      status: project.status || "Planning",
      managerId,
      team: team.length ? [...new Set(team)] : [managerId],
      cancelledBy: project.cancelledBy || "",
      cancelledByName: project.cancelledByName || "",
      cancelledAt: project.cancelledAt || "",
      cancellationReason: project.cancellationReason || "",
      cancellationTaskAction: project.cancellationTaskAction || "",
    };
  });
}

function getDefaultQcStatus(task) {
  if (task.qcStatus) return task.qcStatus;
  if (completeStatuses.has(task.status)) return "Accepted";
  if (task.status === "Pending Review") return "Pending Review";
  if (task.status === "Needs Revision") return "Rejected";
  return "Not Submitted";
}

export function normalizeTasksForEmployees(tasks) {
  if (!Array.isArray(tasks) || !tasks.length) return initialTasks;

  return tasks.map((task) => {
    const seedTask = seedTasksById.get(task.id);
    const isSeedTask = seedTask?.title === task.title && seedTask?.projectId === task.projectId;
    const sourceAssigneeId = isSeedTask ? seedTask.assigneeId : task.assigneeId;

    return {
      ...task,
      assigneeId: normalizeEmployeeId(sourceAssigneeId, fallbackAssigneeId),
      qcStatus: getDefaultQcStatus(task),
      submittedForReviewBy: task.submittedForReviewBy || "",
      submittedForReviewByName: task.submittedForReviewByName || "",
      submittedForReviewAt: task.submittedForReviewAt || "",
      reviewedBy: task.reviewedBy || "",
      reviewedByName: task.reviewedByName || "",
      reviewedAt: task.reviewedAt || "",
      reviewComment: task.reviewComment || "",
      revisionCount: Number(task.revisionCount || 0),
      returnedToAssigneeAt: task.returnedToAssigneeAt || "",
    };
  });
}
