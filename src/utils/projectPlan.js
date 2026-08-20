// ---------------------------------------------------------------------------
// Project planning engine — the scheduling behind the Plan tab.
//
// Turns a flat task list into an MS-Project-style plan:
//   - a work breakdown structure, where a parent rolls up its children
//   - durations measured in working days
//   - finish-to-start dependencies, scheduled forward from their predecessors
//   - a critical path: the chain where any slip moves the project finish date
//
// Nothing here mutates a task. It reads the list and returns a computed view,
// so the stored data stays exactly what the rest of the app already writes.
// ---------------------------------------------------------------------------

// The company works Sunday to Thursday; Friday and Saturday are the weekend.
const WEEKEND = new Set([5, 6]); // 5 = Friday, 6 = Saturday

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Build the ISO day from local parts: going through toISOString would shift the
// date across the timezone offset and silently move tasks by a day.
function toIso(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWorkingDay(date) {
  return !WEEKEND.has(date.getDay());
}

export function nextWorkingDay(date) {
  const cursor = new Date(date.getTime());
  while (!isWorkingDay(cursor)) cursor.setDate(cursor.getDate() + 1);
  return cursor;
}

function previousWorkingDay(date) {
  const cursor = new Date(date.getTime());
  cursor.setDate(cursor.getDate() - 1);
  while (!isWorkingDay(cursor)) cursor.setDate(cursor.getDate() - 1);
  return cursor;
}

/** Finish date for a task starting on `start` and lasting `duration` working days. */
export function addWorkingDays(start, duration) {
  const days = Math.max(1, Math.round(Number(duration) || 1));
  const cursor = nextWorkingDay(new Date(start.getTime()));
  let counted = 1;
  while (counted < days) {
    cursor.setDate(cursor.getDate() + 1);
    if (isWorkingDay(cursor)) counted += 1;
  }
  return cursor;
}

function subtractWorkingDays(finish, duration) {
  const days = Math.max(1, Math.round(Number(duration) || 1));
  const cursor = new Date(finish.getTime());
  while (!isWorkingDay(cursor)) cursor.setDate(cursor.getDate() - 1);
  let counted = 1;
  while (counted < days) {
    cursor.setDate(cursor.getDate() - 1);
    if (isWorkingDay(cursor)) counted += 1;
  }
  return cursor;
}

/** Working days from `start` to `end`, counting both ends. */
export function workingDaysBetween(start, end) {
  if (!start || !end || end < start) return 1;
  const cursor = new Date(start.getTime());
  let count = 0;
  while (cursor <= end) {
    if (isWorkingDay(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(1, count);
}

export function getTaskDuration(task) {
  const stored = Number(task?.duration);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
  const start = parseDate(task?.start);
  const end = parseDate(task?.end);
  if (start && end) return workingDaysBetween(start, end);
  return 1;
}

export function getParentId(task) {
  const value = task?.parentId;
  return value === undefined || value === null || value === "" ? null : String(value);
}

export function getPredecessorIds(task) {
  return (Array.isArray(task?.dependencies) ? task.dependencies : []).map(String);
}

function clampProgress(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

// ---------------------------------------------------------------------------
// Outline
// ---------------------------------------------------------------------------

function buildOutline(tasks) {
  const byParent = new Map();
  const known = new Set(tasks.map((task) => String(task.id)));

  for (const task of tasks) {
    // A parent that no longer exists would orphan the task, so treat it as root.
    let parent = getParentId(task);
    if (parent && (!known.has(parent) || parent === String(task.id))) parent = null;
    const key = parent || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(task);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      const startA = String(a.start || "9999-99-99");
      const startB = String(b.start || "9999-99-99");
      if (startA !== startB) return startA.localeCompare(startB);
      return Number(a.id) - Number(b.id);
    });
  }

  const rows = [];
  const visited = new Set();
  const walk = (parentKey, level, prefix) => {
    for (const [index, task] of (byParent.get(parentKey) || []).entries()) {
      const id = String(task.id);
      if (visited.has(id)) continue; // defensive: a loop in parentId
      visited.add(id);
      const wbs = prefix ? `${prefix}.${index + 1}` : String(index + 1);
      rows.push({ task, level, wbs, childIds: (byParent.get(id) || []).map((c) => String(c.id)) });
      walk(id, level + 1, wbs);
    }
  };
  walk("__root__", 0, "");

  // Anything unreachable still gets shown rather than disappearing.
  for (const task of tasks) {
    if (!visited.has(String(task.id))) {
      rows.push({ task, level: 0, wbs: String(rows.length + 1), childIds: [] });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export function buildProjectPlan(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const outline = buildOutline(list);
  const byId = new Map(outline.map((row) => [String(row.task.id), row]));

  // Forward pass: a task starts once every predecessor has finished.
  const scheduled = new Map();
  const resolving = new Set();

  const scheduleLeaf = (row) => {
    const id = String(row.task.id);
    if (scheduled.has(id)) return scheduled.get(id);

    if (resolving.has(id)) {
      // Dependencies loop back on themselves — fall back to the stored dates
      // and flag it, rather than looping forever.
      const own = parseDate(row.task.start) || nextWorkingDay(new Date());
      const fallback = { start: own, finish: addWorkingDays(own, getTaskDuration(row.task)), circular: true };
      scheduled.set(id, fallback);
      return fallback;
    }
    resolving.add(id);

    let start = parseDate(row.task.start);
    let circular = false;

    for (const depId of getPredecessorIds(row.task)) {
      const predecessor = byId.get(depId);
      if (!predecessor) continue;
      const done = predecessor.childIds.length ? rollUp(predecessor) : scheduleLeaf(predecessor);
      if (done.circular) circular = true;
      const after = new Date(done.finish.getTime());
      after.setDate(after.getDate() + 1);
      const earliest = nextWorkingDay(after);
      if (!start || earliest > start) start = earliest;
    }

    start = nextWorkingDay(start || new Date());
    const result = { start, finish: addWorkingDays(start, getTaskDuration(row.task)), circular };
    resolving.delete(id);
    scheduled.set(id, result);
    return result;
  };

  // A summary task spans its children.
  const rolling = new Set();
  function rollUp(row) {
    const id = String(row.task.id);
    if (!row.childIds.length) return scheduleLeaf(row);
    if (rolling.has(id)) return scheduled.get(id) || scheduleLeaf(row);
    rolling.add(id);

    const results = row.childIds
      .map((childId) => byId.get(childId))
      .filter(Boolean)
      .map((child) => (child.childIds.length ? rollUp(child) : scheduleLeaf(child)))
      .filter(Boolean);

    rolling.delete(id);
    if (!results.length) return scheduleLeaf(row);

    const result = {
      start: new Date(Math.min(...results.map((r) => r.start.getTime()))),
      finish: new Date(Math.max(...results.map((r) => r.finish.getTime()))),
      circular: results.some((r) => r.circular),
    };
    scheduled.set(id, result);
    return result;
  }

  for (const row of outline) {
    if (!row.childIds.length) scheduleLeaf(row);
  }
  for (const row of outline) {
    if (row.childIds.length) rollUp(row);
  }

  const times = [...scheduled.values()];
  const projectStartDate = times.length ? new Date(Math.min(...times.map((t) => t.start.getTime()))) : null;
  const projectFinishDate = times.length ? new Date(Math.max(...times.map((t) => t.finish.getTime()))) : null;

  // Backward pass over the leaves: how late could this finish without pushing
  // the project end out? No float means it is on the critical path.
  const successors = new Map();
  for (const row of outline) {
    for (const depId of getPredecessorIds(row.task)) {
      if (!successors.has(depId)) successors.set(depId, []);
      successors.get(depId).push(String(row.task.id));
    }
  }

  const latestFinish = new Map();
  const computeLatest = (id, guard) => {
    if (latestFinish.has(id)) return latestFinish.get(id);
    if (guard.has(id)) return projectFinishDate;
    guard.add(id);

    let latest = projectFinishDate;
    for (const successorId of successors.get(id) || []) {
      const successor = byId.get(successorId);
      if (!successor) continue;
      const successorLatestFinish = computeLatest(successorId, guard);
      if (!successorLatestFinish) continue;
      const successorLatestStart = subtractWorkingDays(
        successorLatestFinish,
        getTaskDuration(successor.task),
      );
      const candidate = previousWorkingDay(successorLatestStart);
      if (!latest || candidate < latest) latest = candidate;
    }

    guard.delete(id);
    latestFinish.set(id, latest);
    return latest;
  };

  for (const row of outline) {
    if (!row.childIds.length) computeLatest(String(row.task.id), new Set());
  }

  const rows = outline.map((row) => {
    const id = String(row.task.id);
    const time = scheduled.get(id) || {};
    const isSummary = row.childIds.length > 0;
    const latest = isSummary ? null : latestFinish.get(id);

    // Float in working days: 0 (or less) means it is critical.
    let slack = null;
    if (latest && time.finish) {
      slack = latest.getTime() <= time.finish.getTime()
        ? 0
        : workingDaysBetween(time.finish, latest) - 1;
    }

    return {
      id,
      task: row.task,
      level: row.level,
      wbs: row.wbs,
      isSummary,
      childIds: row.childIds,
      duration: isSummary
        ? workingDaysBetween(time.start, time.finish)
        : getTaskDuration(row.task),
      start: toIso(time.start),
      finish: toIso(time.finish),
      startDate: time.start || null,
      finishDate: time.finish || null,
      critical: !isSummary && slack === 0,
      slack,
      circular: Boolean(time.circular),
      progress: isSummary ? rollUpProgress(row, byId) : clampProgress(row.task.progress),
      predecessors: getPredecessorIds(row.task)
        .map((depId) => byId.get(depId))
        .filter(Boolean)
        .map((depRow) => ({ id: String(depRow.task.id), wbs: depRow.wbs, title: depRow.task.title })),
      milestone: !isSummary && Boolean(row.task.milestone),
    };
  });

  return {
    rows,
    projectStart: toIso(projectStartDate),
    projectFinish: toIso(projectFinishDate),
    projectStartDate,
    projectFinishDate,
    totalWorkingDays:
      projectStartDate && projectFinishDate
        ? workingDaysBetween(projectStartDate, projectFinishDate)
        : 0,
    criticalCount: rows.filter((row) => row.critical).length,
    hasCircular: rows.some((row) => row.circular),
  };
}

/** A summary task's progress is the duration-weighted average of its leaves. */
function rollUpProgress(row, byId) {
  const stack = [...row.childIds];
  const seen = new Set();
  let weighted = 0;
  let total = 0;

  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const child = byId.get(id);
    if (!child) continue;
    if (child.childIds.length) {
      stack.push(...child.childIds);
      continue;
    }
    const duration = getTaskDuration(child.task);
    weighted += clampProgress(child.task.progress) * duration;
    total += duration;
  }
  return total ? Math.round(weighted / total) : 0;
}

export { toIso as toPlanDate, parseDate as parsePlanDate };
