import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Diamond,
  Indent,
  Outdent,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "./ui.jsx";
import {
  buildProjectPlan,
  getParentId,
  getPredecessorIds,
  parsePlanDate,
  workingDaysBetween,
} from "../utils/projectPlan.js";

// ---------------------------------------------------------------------------
// The Plan tab: an MS-Project-style work breakdown for one project.
//
// Rows are the project's tasks arranged into an outline. Dates are scheduled,
// not typed: a task follows its predecessors, a parent spans its children, and
// the chain with no float is marked as the critical path.
// ---------------------------------------------------------------------------

function ProgressCell({ value, critical, summary }) {
  return (
    <div className={`plan-bar${summary ? " is-summary" : ""}${critical ? " is-critical" : ""}`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      <small>{value}%</small>
    </div>
  );
}

export function ProjectPlan({
  project,
  tasks,
  employees,
  canEdit,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [linking, setLinking] = useState(null); // id of the row picking a predecessor

  const plan = useMemo(() => buildProjectPlan(tasks), [tasks]);

  // Hide anything sitting under a collapsed parent.
  const visibleRows = useMemo(() => {
    const hidden = new Set();
    for (const row of plan.rows) {
      const parent = getParentId(row.task);
      if ((parent && hidden.has(parent)) || (parent && collapsed.has(parent))) {
        hidden.add(row.id);
      }
    }
    return plan.rows.filter((row) => !hidden.has(row.id));
  }, [plan.rows, collapsed]);

  const rowsById = useMemo(
    () => new Map(plan.rows.map((row) => [row.id, row])),
    [plan.rows],
  );

  function toggleCollapse(id) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Indent: become a child of the row directly above at the same level.
  function indent(row) {
    const index = plan.rows.findIndex((item) => item.id === row.id);
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = plan.rows[i];
      if (candidate.level === row.level) {
        onUpdateTask(row.task.id, { parentId: candidate.id, order: Date.now() });
        return;
      }
      if (candidate.level < row.level) break;
    }
  }

  // Outdent: move up to the grandparent.
  function outdent(row) {
    const parentId = getParentId(row.task);
    if (!parentId) return;
    const parentRow = rowsById.get(parentId);
    onUpdateTask(row.task.id, {
      parentId: parentRow ? getParentId(parentRow.task) : null,
      order: Date.now(),
    });
  }

  function move(row, direction) {
    const siblings = plan.rows.filter(
      (item) => getParentId(item.task) === getParentId(row.task),
    );
    const index = siblings.findIndex((item) => item.id === row.id);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;
    const a = Number.isFinite(Number(row.task.order)) ? Number(row.task.order) : index;
    const b = Number.isFinite(Number(swapWith.task.order)) ? Number(swapWith.task.order) : index + direction;
    onUpdateTask(row.task.id, { order: b });
    onUpdateTask(swapWith.task.id, { order: a });
  }

  // Setting a finish date is really setting how long the task takes, measured
  // from the date the schedule gives it.
  function setFinish(row, value) {
    if (!value) return;
    const start = parsePlanDate(row.start);
    const finish = parsePlanDate(value);
    if (!start || !finish) return;
    if (finish < start) {
      // A finish before the start would be meaningless — keep it at one day.
      onUpdateTask(row.task.id, { duration: 1, end: row.start, milestone: false });
      return;
    }
    onUpdateTask(row.task.id, {
      duration: workingDaysBetween(start, finish),
      end: value,
      milestone: false,
    });
  }

  function linkPredecessor(row, predecessorId) {
    setLinking(null);
    if (!predecessorId) return;
    const existing = getPredecessorIds(row.task);
    if (existing.includes(String(predecessorId)) || String(predecessorId) === row.id) return;
    onUpdateTask(row.task.id, { dependencies: [...existing, predecessorId] });
  }

  function unlinkPredecessor(row, predecessorId) {
    onUpdateTask(row.task.id, {
      dependencies: getPredecessorIds(row.task).filter((id) => id !== String(predecessorId)),
    });
  }

  if (!plan.rows.length) {
    return (
      <div className="plan-empty">
        <h4>No tasks in this plan yet</h4>
        <p>Add the first task to start building the schedule.</p>
        {canEdit ? (
          <button className="primary-button compact-button" type="button" onClick={() => onCreateTask(null)}>
            <Plus size={15} aria-hidden="true" />
            Add task
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="project-plan">
      <header className="plan-summary">
        <div>
          <span>Starts</span>
          <strong>{plan.projectStart || "—"}</strong>
        </div>
        <div>
          <span>Finishes</span>
          <strong>{plan.projectFinish || "—"}</strong>
        </div>
        <div>
          <span>Working days</span>
          <strong>{plan.totalWorkingDays}</strong>
        </div>
        <div>
          <span>On critical path</span>
          <strong className="plan-critical-count">{plan.criticalCount}</strong>
        </div>
        {canEdit ? (
          <button className="primary-button compact-button" type="button" onClick={() => onCreateTask(null)}>
            <Plus size={15} aria-hidden="true" />
            Add task
          </button>
        ) : null}
      </header>

      {plan.hasCircular ? (
        <div className="plan-warning">
          <TriangleAlert size={16} aria-hidden="true" />
          Some tasks depend on each other in a loop, so their dates fall back to what was entered.
          Remove one of the links to schedule them properly.
        </div>
      ) : null}

      <div className="plan-scroll">
        <table className="plan-table">
          <thead>
            <tr>
              <th className="plan-col-wbs">#</th>
              <th className="plan-col-name">Task</th>
              <th className="plan-col-dur">Days</th>
              <th className="plan-col-date">Start</th>
              <th className="plan-col-date">Finish</th>
              <th className="plan-col-pred">Depends on</th>
              <th className="plan-col-owner">Owner</th>
              <th className="plan-col-progress">Progress</th>
              {canEdit ? <th className="plan-col-actions">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isCollapsed = collapsed.has(row.id);
              const owner = employees.find((person) => person.id === row.task.assigneeId);
              return (
                <tr
                  key={row.id}
                  className={[
                    row.isSummary ? "plan-row-summary" : "",
                    row.critical ? "plan-row-critical" : "",
                    row.milestone ? "plan-row-milestone" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <td className="plan-col-wbs">{row.wbs}</td>

                  <td className="plan-col-name">
                    <div className="plan-name" style={{ paddingInlineStart: `${row.level * 20}px` }}>
                      {row.isSummary ? (
                        <button
                          className="plan-twisty"
                          type="button"
                          aria-label={isCollapsed ? "Expand" : "Collapse"}
                          onClick={() => toggleCollapse(row.id)}
                        >
                          {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                        </button>
                      ) : (
                        <span className="plan-twisty-spacer">
                          {row.milestone ? <Diamond size={12} aria-hidden="true" /> : null}
                        </span>
                      )}
                      {canEdit ? (
                        <input
                          value={row.task.title || ""}
                          onChange={(event) => onUpdateTask(row.task.id, { title: event.target.value })}
                        />
                      ) : (
                        <span className="plan-name-static">{row.task.title}</span>
                      )}
                    </div>
                  </td>

                  <td className="plan-col-dur">
                    {row.isSummary ? (
                      <span className="plan-readonly">{row.duration}</span>
                    ) : canEdit ? (
                      <input
                        type="number"
                        min="0"
                        value={row.milestone ? 0 : row.duration}
                        onChange={(event) => {
                          const days = Math.max(0, Number(event.target.value) || 0);
                          onUpdateTask(row.task.id, {
                            duration: Math.max(1, days),
                            milestone: days === 0,
                          });
                        }}
                      />
                    ) : (
                      <span className="plan-readonly">{row.duration}</span>
                    )}
                  </td>

                  <td className="plan-col-date">
                    {row.isSummary || row.predecessors.length ? (
                      // Scheduled from the plan — typing here would be ignored.
                      <span className="plan-readonly" title="Set by the schedule">{row.start}</span>
                    ) : canEdit ? (
                      <input
                        type="date"
                        value={row.task.start || row.start}
                        onChange={(event) => onUpdateTask(row.task.id, { start: event.target.value })}
                      />
                    ) : (
                      <span className="plan-readonly">{row.start}</span>
                    )}
                  </td>

                  <td className="plan-col-date">
                    {row.isSummary ? (
                      <span className="plan-readonly" title="Spans its sub-tasks">{row.finish}</span>
                    ) : canEdit ? (
                      // Typing a finish date sets the duration; the schedule
                      // still owns the start, so the two never disagree.
                      <input
                        type="date"
                        value={row.finish}
                        min={row.start}
                        onChange={(event) => setFinish(row, event.target.value)}
                      />
                    ) : (
                      <span className="plan-readonly">{row.finish}</span>
                    )}
                  </td>

                  <td className="plan-col-pred">
                    <div className="plan-preds">
                      {row.predecessors.map((predecessor) => (
                        <span className="plan-pred" key={predecessor.id} title={predecessor.title}>
                          {predecessor.wbs}
                          {canEdit ? (
                            <button
                              type="button"
                              aria-label={`Remove dependency on ${predecessor.title}`}
                              onClick={() => unlinkPredecessor(row, predecessor.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </span>
                      ))}

                      {canEdit && !row.isSummary ? (
                        linking === row.id ? (
                          <select
                            autoFocus
                            defaultValue=""
                            onBlur={() => setLinking(null)}
                            onChange={(event) => linkPredecessor(row, event.target.value)}
                          >
                            <option value="">Choose…</option>
                            {plan.rows
                              .filter((item) => item.id !== row.id && !item.isSummary)
                              .map((item) => (
                                <option value={item.id} key={item.id}>
                                  {item.wbs} · {item.task.title}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <button
                            className="plan-link-add"
                            type="button"
                            onClick={() => setLinking(row.id)}
                          >
                            <CornerDownRight size={13} aria-hidden="true" />
                            link
                          </button>
                        )
                      ) : null}
                    </div>
                  </td>

                  <td className="plan-col-owner">
                    {row.isSummary ? (
                      <span className="plan-readonly">—</span>
                    ) : canEdit ? (
                      <select
                        value={row.task.assigneeId || ""}
                        onChange={(event) => onUpdateTask(row.task.id, { assigneeId: event.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {employees.map((person) => (
                          <option value={person.id} key={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="plan-readonly">{owner?.name || "—"}</span>
                    )}
                  </td>

                  <td className="plan-col-progress">
                    <ProgressCell value={row.progress} critical={row.critical} summary={row.isSummary} />
                    {!row.isSummary && canEdit ? (
                      <input
                        className="plan-progress-input"
                        type="number"
                        min="0"
                        max="100"
                        value={row.progress}
                        onChange={(event) => onUpdateTask(row.task.id, { progress: event.target.value })}
                      />
                    ) : null}
                  </td>

                  {canEdit ? (
                    <td className="plan-col-actions">
                      <div className="plan-actions">
                        <button type="button" title="Move up" onClick={() => move(row, -1)}>↑</button>
                        <button type="button" title="Move down" onClick={() => move(row, 1)}>↓</button>
                        <button type="button" title="Indent — make it a sub-task" onClick={() => indent(row)}>
                          <Indent size={14} aria-hidden="true" />
                        </button>
                        <button type="button" title="Outdent" onClick={() => outdent(row)}>
                          <Outdent size={14} aria-hidden="true" />
                        </button>
                        <button type="button" title="Add a sub-task" onClick={() => onCreateTask(row.id)}>
                          <Plus size={14} aria-hidden="true" />
                        </button>
                        <button
                          className="plan-delete"
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (window.confirm(`Delete "${row.task.title}"? It moves to the Recycle Bin.`)) {
                              onDeleteTask(row.task.id);
                            }
                          }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="plan-legend">
        <span><i className="plan-swatch plan-swatch-critical" /> Critical path — a slip here moves the project finish</span>
        <span><i className="plan-swatch plan-swatch-summary" /> Summary task — dates and progress roll up from its children</span>
        <span>Weekends (Fri &amp; Sat) are excluded from durations.</span>
      </footer>
    </div>
  );
}
