import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink, Send, Trash2 } from "lucide-react";
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

function TaskCard({
  task,
  projects,
  employees,
  currentPersonId,
  statusOptions,
  readOnly,
  isTaskLocked,
  canManageTaskStructure,
  canSubmitTaskReview,
  canDeleteTasks,
  onUpdateTask,
  onSubmitTaskReview,
  onDeleteTask,
}) {
  const [open, setOpen] = useState(false);
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

  function update(patch) {
    if (rowReadOnly) return;
    onUpdateTask(task.id, patch);
  }

  async function copyPath(value) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  }

  return (
    <article className={`task-card${rowReadOnly ? " task-row-locked" : ""}${open ? " task-card-open" : ""}`}>
      <button
        type="button"
        className="task-card-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown size={18} className="task-card-caret" aria-hidden="true" />
        ) : (
          <ChevronRight size={18} className="task-card-caret" aria-hidden="true" />
        )}
        <span className="task-card-toggle-title">{task.title || "Untitled task"}</span>
        <span className="task-card-badges">
          <StatusBadge value={task.status} />
          <PriorityBadge value={task.priority} />
          {getDueBadge(task)}
        </span>
      </button>

      {open ? (
        <div className="task-card-body">
          <div className="task-card-grid">
            <label className="task-field task-field-wide">
              <span className="task-field-label">Task title</span>
              <input
                className="task-card-title"
                value={task.title}
                disabled={rowReadOnly || !canManageTaskStructure}
                onChange={(event) => update({ title: event.target.value })}
              />
            </label>

            <label className="task-field">
              <span className="task-field-label">Project</span>
              <select
                value={task.projectId}
                disabled={rowReadOnly || !canManageTaskStructure}
                onChange={(event) => update({ projectId: event.target.value })}
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
            </label>

            <label className="task-field">
              <span className="task-field-label">Assignee</span>
              <select
                value={task.assigneeId}
                disabled={rowReadOnly || !canManageTaskStructure}
                onChange={(event) => update({ assigneeId: event.target.value })}
              >
                {employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employee.name} - {employee.title}
                  </option>
                ))}
              </select>
              <small>{assignee?.department}</small>
            </label>

            <label className="task-field">
              <span className="task-field-label">Status</span>
              <select
                value={task.status}
                disabled={rowReadOnly}
                onChange={(event) => update({ status: event.target.value })}
              >
                {rowStatusOptions.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="task-field">
              <span className="task-field-label">Priority</span>
              <select
                value={task.priority}
                disabled={rowReadOnly || !canManageTaskStructure}
                onChange={(event) => update({ priority: event.target.value })}
              >
                {priorities.map((priority) => (
                  <option value={priority} key={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="task-field">
              <span className="task-field-label">Progress</span>
              <div className="task-progress-field">
                <input
                  className="number-input"
                  type="number"
                  min="0"
                  max="100"
                  value={task.progress}
                  disabled={rowReadOnly}
                  onChange={(event) => update({ progress: event.target.value })}
                />
                <ProgressBar value={task.progress} />
              </div>
            </label>

            <div className="task-field">
              <span className="task-field-label">Start &amp; Due dates</span>
              <div className="task-card-dates">
                <label className="task-date-sub">
                  <small>Start</small>
                  <input
                    type="date"
                    value={task.start}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => update({ start: event.target.value })}
                  />
                </label>
                <label className="task-date-sub">
                  <small>Due</small>
                  <input
                    type="date"
                    value={task.end}
                    disabled={rowReadOnly || !canManageTaskStructure}
                    onChange={(event) => update({ end: event.target.value })}
                  />
                </label>
              </div>
              <div className="task-date-status">{getDueBadge(task)}</div>
            </div>

            <div className="task-field">
              <span className="task-field-label">Approval</span>
              {task.approvalRequired ? (
                <div className="approval-cell">
                  <StatusBadge value={task.approvalStatus || "Pending Approval"} />
                  <small>{task.approvalOwner || "Approval owner pending"}</small>
                  {task.createdBy?.name ? (
                    <Badge tone="neutral">By {task.createdBy.name}</Badge>
                  ) : null}
                </div>
              ) : (
                <span className="muted">Operational (no approval needed)</span>
              )}
            </div>

            <div className="task-field">
              <span className="task-field-label">QC Review</span>
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
            </div>

            <label className="task-field task-field-wide">
              <span className="task-field-label">Task Data (path or download link)</span>
              <div className="task-data-field">
                <select
                  value={task.dataRefType}
                  disabled={rowReadOnly}
                  onChange={(event) => update({ dataRefType: event.target.value })}
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
                  onChange={(event) => update({ dataRefValue: event.target.value })}
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
                  <button className="mini-action" type="button" onClick={() => copyPath(task.dataRefValue)}>
                    <Copy size={14} aria-hidden="true" />
                    Copy
                  </button>
                )}
              </div>
            </label>

            <label className="task-field task-field-wide">
              <span className="task-field-label">Notes</span>
              <textarea
                value={task.notes}
                placeholder="Add notes for this task…"
                disabled={rowReadOnly}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </label>
          </div>

          <footer className="task-card-foot">
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
              <span className="muted">No action needed</span>
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
          </footer>
        </div>
      ) : null}
    </article>
  );
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

  if (!tasks.length) {
    return (
      <div className="empty-state">
        <h3>No tasks yet</h3>
        <p>Create the first task to start tracking progress and workload.</p>
      </div>
    );
  }

  return (
    <div className="task-card-list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          projects={projects}
          employees={employees}
          currentPersonId={currentPersonId}
          statusOptions={statusOptions}
          readOnly={readOnly}
          isTaskLocked={isTaskLocked}
          canManageTaskStructure={canManageTaskStructure}
          canSubmitTaskReview={canSubmitTaskReview}
          canDeleteTasks={canDeleteTasks}
          onUpdateTask={onUpdateTask}
          onSubmitTaskReview={onSubmitTaskReview}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
