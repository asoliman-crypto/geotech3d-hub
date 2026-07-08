import { Copy, ExternalLink, Send, Trash2 } from "lucide-react";
import { normalizeUrl } from "../utils/linkUtils.js";
import { Badge, PriorityBadge, ProgressBar, StatusBadge } from "./ui.jsx";

const statuses = [
  "Planning",
  "To Do",
  "In Progress",
  "Under Review",
  "Blocked",
  "Pending Approval",
  "Pending Review",
  "Needs Revision",
  "Modification Requested",
  "Rejected",
  "Cancelled",
  "Completed",
  "Done",
];
const priorities = ["Low", "Medium", "High"];
const dataTypes = ["Path", "Download Link"];

function getDaysUntil(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const target = new Date(`${value}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

const completeStatuses = ["Done", "Completed"];

function isComplete(task) {
  return completeStatuses.includes(task?.status);
}

function getQcBadgeValue(task) {
  if (task.qcStatus === "Accepted") return "QC Accepted";
  if (task.qcStatus === "Rejected") return "QC Rejected";
  if (task.qcStatus === "Pending Review") return "Pending Review";
  return task.qcStatus || "Not Submitted";
}

function getStatusOptions(canCompleteTasksDirectly) {
  if (canCompleteTasksDirectly) return statuses;
  return statuses.filter((status) => !completeStatuses.includes(status) && status !== "Pending Review");
}

function getDueBadge(task) {
  if (!task.end || isComplete(task) || task.status === "Cancelled") return null;
  const days = getDaysUntil(task.end);
  if (days < 0) return <Badge tone="danger">{Math.abs(days)}d overdue</Badge>;
  if (days === 0) return <Badge tone="danger">Due today</Badge>;
  if (days <= 7) return <Badge tone="warning">Due in {days}d</Badge>;
  return <Badge tone="neutral">Due in {days}d</Badge>;
}

export function TaskTable({
  tasks,
  projects,
  employees,
  onUpdateTask,
  readOnly = false,
  currentUser = null,
  canSubmitTaskReview = false,
  canCompleteTasksDirectly = false,
  canManageTaskStructure = false,
  canDeleteTasks = false,
  onDeleteTask,
  onSubmitTaskReview,
  isTaskLocked = () => false,
}) {
  const currentPersonId = currentUser?.employeeId || currentUser?.id;
  const statusOptions = getStatusOptions(canCompleteTasksDirectly);

  function updateTask(id, patch, task) {
    if (readOnly || isTaskLocked(task)) return;
    onUpdateTask(id, patch);
  }

  async function copyPath(value) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  }

  if (!tasks.length) {
    return (
      <div className="empty-state">
        <h3>No tasks yet</h3>
        <p>Create the first task to start tracking progress and workload.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Project</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Approval</th>
            <th>QC Review</th>
            <th>Progress</th>
            <th>Dates</th>
            <th>Priority</th>
            <th>Task Data</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const project = projects.find((item) => item.id === task.projectId);
            const assignee = employees.find((employee) => employee.id === task.assigneeId);
            const rowReadOnly = readOnly || isTaskLocked(task);
            const canSubmitThisTask =
              canSubmitTaskReview &&
              !rowReadOnly &&
              currentPersonId &&
              task.assigneeId === currentPersonId &&
              !task.approvalRequired &&
              !isComplete(task) &&
              task.status !== "Pending Review";
            const rowStatusOptions = statusOptions.includes(task.status)
              ? statusOptions
              : [task.status, ...statusOptions];
            return (
              <tr className={rowReadOnly ? "task-row-locked" : ""} key={task.id}>
                <td>
                  <input
                    value={task.title}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => updateTask(task.id, { title: event.target.value }, task)}
                  />
                </td>
                <td>
                  <select
                    value={task.projectId}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => updateTask(task.id, { projectId: event.target.value }, task)}
                  >
                    {projects.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.id}
                      </option>
                    ))}
                  </select>
                  <small>{project?.name}</small>
                  {rowReadOnly && project?.status === "Cancelled" ? (
                    <Badge tone="danger">Locked by cancellation</Badge>
                  ) : null}
                </td>
                <td>
                  <select
                    value={task.assigneeId}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) =>
                      updateTask(task.id, { assigneeId: event.target.value }, task)
                    }
                  >
                    {employees.map((employee) => (
                      <option value={employee.id} key={employee.id}>
                        {employee.name} - {employee.title}
                      </option>
                    ))}
                  </select>
                  <small>{assignee?.department}</small>
                </td>
                <td>
                  <select
                    value={task.status}
                    disabled={rowReadOnly}
                    onChange={(event) => updateTask(task.id, { status: event.target.value }, task)}
                  >
                    {rowStatusOptions.map((status) => (
                      <option value={status} key={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <StatusBadge value={task.status} />
                </td>
                <td>
                  {task.approvalRequired ? (
                    <div className="approval-cell">
                      <StatusBadge value={task.approvalStatus || "Pending Approval"} />
                      <small>{task.approvalOwner || "Approval owner pending"}</small>
                      {task.createdBy?.name ? (
                        <Badge tone="neutral">By {task.createdBy.name}</Badge>
                      ) : null}
                    </div>
                  ) : (
                    <span className="muted">Operational</span>
                  )}
                </td>
                <td>
                  <div className="approval-cell">
                    <StatusBadge value={getQcBadgeValue(task)} />
                    {task.submittedForReviewAt ? (
                      <small>Submitted {new Date(task.submittedForReviewAt).toLocaleDateString("en")}</small>
                    ) : (
                      <small>Not submitted to Team Lead</small>
                    )}
                    {task.reviewedByName ? <small>Reviewed by {task.reviewedByName}</small> : null}
                    {task.revisionCount ? <Badge tone="warning">Revision {task.revisionCount}</Badge> : null}
                    {task.reviewComment ? <div className="review-note-inline">{task.reviewComment}</div> : null}
                  </div>
                </td>
                <td>
                  <input
                    className="number-input"
                    type="number"
                    min="0"
                    max="100"
                    value={task.progress}
                    disabled={rowReadOnly}
                    onChange={(event) => updateTask(task.id, { progress: event.target.value }, task)}
                  />
                  <ProgressBar value={task.progress} />
                </td>
                <td>
                  <input
                    type="date"
                    value={task.start}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => updateTask(task.id, { start: event.target.value }, task)}
                  />
                  <input
                    type="date"
                    value={task.end}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => updateTask(task.id, { end: event.target.value }, task)}
                  />
                  <div className="task-date-status">{getDueBadge(task)}</div>
                </td>
                <td>
                  <select
                    value={task.priority}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => updateTask(task.id, { priority: event.target.value }, task)}
                  >
                    {priorities.map((priority) => (
                      <option value={priority} key={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  <PriorityBadge value={task.priority} />
                </td>
                <td>
                  <select
                    value={task.dataRefType}
                    disabled={rowReadOnly}
                    onChange={(event) => updateTask(task.id, { dataRefType: event.target.value }, task)}
                  >
                    {dataTypes.map((type) => (
                      <option value={type} key={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    value={task.dataRefValue}
                    placeholder="Path or download link"
                    disabled={rowReadOnly}
                    onChange={(event) =>
                      updateTask(task.id, { dataRefValue: event.target.value }, task)
                    }
                  />
                  {task.dataRefType === "Download Link" ? (
                    <a
                      className="mini-action"
                      href={normalizeUrl(task.dataRefValue)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      Open
                    </a>
                  ) : (
                    <button
                      className="mini-action"
                      type="button"
                      onClick={() => copyPath(task.dataRefValue)}
                    >
                      <Copy size={14} aria-hidden="true" />
                      Copy
                    </button>
                  )}
                </td>
                <td>
                  <textarea
                    value={task.notes}
                    disabled={rowReadOnly}
                    onChange={(event) => updateTask(task.id, { notes: event.target.value }, task)}
                  />
                </td>
                <td>
                  <div className="task-action-stack">
                    {canSubmitThisTask ? (
                      <button
                        className="primary-button compact-button"
                        type="button"
                        onClick={() => onSubmitTaskReview?.(task.id)}
                      >
                        <Send size={14} aria-hidden="true" />
                        {task.qcStatus === "Rejected" || task.status === "Needs Revision"
                          ? "Resubmit"
                          : "Submit Review"}
                      </button>
                    ) : task.status === "Pending Review" ? (
                      <Badge tone="warning">Waiting Team Lead</Badge>
                    ) : isComplete(task) ? (
                      <Badge tone="success">Completed</Badge>
                    ) : (
                      <span className="muted">No action</span>
                    )}
                    {canDeleteTasks ? (
                      <button
                        className="danger-button compact-button"
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete task "${task.title}"? It will be moved to the Recycle Bin, not lost.`,
                            )
                          ) {
                            onDeleteTask?.(task.id);
                          }
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
